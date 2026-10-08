import { randomUUID } from "node:crypto";
import type { PGlite, Transaction } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asAnonymous,
  asUser,
  createTestDatabase,
  createUser,
} from "./database";

// One database for the whole file: PGlite takes a few seconds to start.
// Each test creates its own users, so tests cannot see each other's rows.
let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase();
}, 30_000);

afterAll(async () => {
  await db.close();
});

/** Adds an entry for `userId`, or for the signed-in user when it is null. */
function addEntry(tx: Transaction, userId: string | null = null) {
  return tx.query<{ id: string }>(
    `insert into public.food_entries
       (user_id, entry_date, name, quantity, unit, kcal, protein_g, carbs_g, fat_g)
     values
       (coalesce($1::uuid, auth.uid()), '2026-10-08', 'Chicken breast', 150, 'g', 247.5, 46.5, 0, 5.4)
     returning id`,
    [userId],
  );
}

/** Adds a food; created_by defaults to the signed-in user, or stays null for the server. */
function addFood(tx: PGlite | Transaction, name: string) {
  return tx.query(
    `insert into public.foods (name, basis, kcal, protein_g, carbs_g, fat_g, source)
     values ($1, 'per100g', 165, 31, 0, 3.6, 'usda')`,
    [name],
  );
}

describe("profiles", () => {
  it("are created empty at sign-up, so onboarding can ask for the goals", async () => {
    const alice = await createUser(db);
    const { rows } = await asUser(db, alice, (tx) =>
      tx.query(
        "select id, daily_kcal_goal, daily_protein_goal, timezone from public.profiles",
      ),
    );
    // Only Alice's own profile comes back, although other users exist.
    expect(rows).toEqual([
      {
        id: alice,
        daily_kcal_goal: null,
        daily_protein_goal: null,
        timezone: "Europe/Bucharest",
      },
    ]);
  });

  it("can be updated only by their owner", async () => {
    const alice = await createUser(db);
    const bob = await createUser(db);
    const setGoal = (id: string) =>
      asUser(db, alice, (tx) =>
        tx.query(
          "update public.profiles set daily_kcal_goal = 2000 where id = $1",
          [id],
        ),
      );
    expect((await setGoal(alice)).affectedRows).toBe(1);
    expect((await setGoal(bob)).affectedRows).toBe(0);
  });

  it("reject goals outside a realistic range", async () => {
    const alice = await createUser(db);
    const update = asUser(db, alice, (tx) =>
      tx.query(
        "update public.profiles set daily_kcal_goal = 50 where id = $1",
        [alice],
      ),
    );
    await expect(update).rejects.toThrow(/check constraint/);
  });
});

describe("food entries", () => {
  it("are visible only to their owner", async () => {
    const alice = await createUser(db);
    const bob = await createUser(db);
    await asUser(db, alice, (tx) => addEntry(tx));

    const count = (userId: string) =>
      asUser(db, userId, (tx) =>
        tx.query("select id from public.food_entries"),
      ).then((result) => result.rows.length);
    expect(await count(alice)).toBe(1);
    expect(await count(bob)).toBe(0);
  });

  it("cannot be added on behalf of another user", async () => {
    const alice = await createUser(db);
    const bob = await createUser(db);
    await expect(asUser(db, bob, (tx) => addEntry(tx, alice))).rejects.toThrow(
      /row-level security/,
    );
  });

  it("cannot be changed or deleted by another user", async () => {
    const alice = await createUser(db);
    const bob = await createUser(db);
    const { rows } = await asUser(db, alice, (tx) => addEntry(tx));
    const entryId = rows[0].id;

    const changed = await asUser(db, bob, async (tx) => [
      await tx.query("update public.food_entries set kcal = 1 where id = $1", [
        entryId,
      ]),
      await tx.query("delete from public.food_entries where id = $1", [
        entryId,
      ]),
    ]);
    expect(changed.map((result) => result.affectedRows)).toEqual([0, 0]);
  });
});

describe("foods", () => {
  it("in the shared catalog are visible to everyone, private ones only to their owner", async () => {
    const alice = await createUser(db);
    const bob = await createUser(db);
    const shared = `Shared ${randomUUID()}`;
    const mine = `Private ${randomUUID()}`;
    await addFood(db, shared); // The server writes the catalog: no user, so created_by stays null.
    await asUser(db, alice, (tx) => addFood(tx, mine));

    const visibleTo = (userId: string) =>
      asUser(db, userId, (tx) =>
        tx.query<{ name: string }>(
          "select name from public.foods where name in ($1, $2) order by name",
          [mine, shared],
        ),
      ).then((result) => result.rows.map((row) => row.name));
    expect(await visibleTo(alice)).toEqual([mine, shared]);
    expect(await visibleTo(bob)).toEqual([shared]);
  });

  it("in the shared catalog cannot be written by users", async () => {
    const alice = await createUser(db);
    const shared = `Shared ${randomUUID()}`;
    await addFood(db, shared);

    const insertShared = asUser(db, alice, (tx) =>
      tx.query(
        `insert into public.foods (name, basis, kcal, protein_g, carbs_g, fat_g, source, created_by)
         values ('Fake', 'per100g', 1, 0, 0, 0, 'user', null)`,
      ),
    );
    await expect(insertShared).rejects.toThrow(/row-level security/);

    const update = await asUser(db, alice, (tx) =>
      tx.query("update public.foods set kcal = 1 where name = $1", [shared]),
    );
    expect(update.affectedRows).toBe(0);
  });

  it("published per serving must say what the serving is", async () => {
    const alice = await createUser(db);
    const insert = asUser(db, alice, (tx) =>
      tx.query(
        `insert into public.foods (name, basis, kcal, protein_g, carbs_g, fat_g, source)
         values ('Burger', 'perServing', 495, 26, 45, 23, 'web')`,
      ),
    );
    await expect(insert).rejects.toThrow(/per_serving_needs_label/);
  });
});

describe("anonymous visitors", () => {
  it.each(["profiles", "foods", "food_entries"])(
    "cannot read %s",
    async (table) => {
      const read = asAnonymous(db, (tx) =>
        tx.query(`select * from public.${table}`),
      );
      await expect(read).rejects.toThrow(/permission denied/);
    },
  );
});
