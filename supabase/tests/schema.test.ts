import { randomUUID } from "node:crypto";
import type { PGlite, Transaction } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GOAL_LIMITS } from "@/lib/goals/limits";
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

  it("accept exactly the goal ranges the app validates (GOAL_LIMITS)", async () => {
    const alice = await createUser(db);
    const setGoals = (kcal: number, protein: number) =>
      asUser(db, alice, (tx) =>
        tx.query(
          `update public.profiles
           set daily_kcal_goal = $1, daily_protein_goal = $2
           where id = $3`,
          [kcal, protein, alice],
        ),
      );
    const { kcal, protein } = GOAL_LIMITS;

    expect((await setGoals(kcal.min, protein.min)).affectedRows).toBe(1);
    expect((await setGoals(kcal.max, protein.max)).affectedRows).toBe(1);
    for (const [k, p] of [
      [kcal.min - 1, protein.min],
      [kcal.max + 1, protein.min],
      [kcal.min, protein.min - 1],
      [kcal.min, protein.max + 1],
    ]) {
      await expect(setGoals(k, p)).rejects.toThrow(/check constraint/);
    }
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

describe("food search", () => {
  /** Adds a catalog food, the way the server will cache one. */
  function addCatalogFood(name: string, brand: string | null = null) {
    return db.query(
      `insert into public.foods
         (name, brand, basis, kcal, protein_g, carbs_g, fat_g, serving_label, source)
       values ($1, $2, 'perServing', 130, 10, 8, 6, '1 piece', 'web')`,
      [name, brand],
    );
  }

  function search(userId: string, query: string, maxResults?: number) {
    return asUser(db, userId, (tx) =>
      tx.query<{ name: string; brand: string | null; similarity: number }>(
        maxResults === undefined
          ? "select name, brand, similarity from public.search_foods($1)"
          : "select name, brand, similarity from public.search_foods($1, $2)",
        maxResults === undefined ? [query] : [query, maxResults],
      ),
    ).then((result) => result.rows);
  }

  beforeAll(async () => {
    await addCatalogFood("Crispy Strips", "KFC");
    await addCatalogFood("Hot Wings", "KFC");
    await addCatalogFood("McDonald's Big Mac", "McDonald's");
    await addCatalogFood("Ciorbă de burtă");
  });

  it("ignores diacritics, case, word order and apostrophes", async () => {
    const alice = await createUser(db);
    for (const [query, name] of [
      ["ciorba de burta", "Ciorbă de burtă"],
      ["crispy strips kfc", "Crispy Strips"],
      ["McDonalds Big Mac", "McDonald's Big Mac"],
    ]) {
      const [best] = await search(alice, query);
      expect(best).toMatchObject({ name, similarity: 1 });
    }
  });

  it("ranks the closest food first and leaves out foods that are not alike", async () => {
    const alice = await createUser(db);
    const found = await search(alice, "KFC Crispy Strip");
    expect(found.map((food) => food.name)).toEqual(["Crispy Strips"]);
    expect(found[0].similarity).toBeGreaterThan(0.8);
    expect(found[0].similarity).toBeLessThan(1);
  });

  it("finds a user's own foods, never another user's", async () => {
    const alice = await createUser(db);
    const bob = await createUser(db);
    const name = `Tort de casă ${randomUUID()}`;
    await asUser(db, alice, (tx) => addFood(tx, name));

    expect((await search(alice, name)).map((food) => food.name)).toContain(
      name,
    );
    expect((await search(bob, name)).map((food) => food.name)).not.toContain(
      name,
    );
  });

  it("returns between 1 and 20 foods, whatever the caller asks for", async () => {
    const alice = await createUser(db);
    for (let i = 1; i <= 21; i++) await addCatalogFood(`Supă cremă ${i}`);

    expect(await search(alice, "supa crema", 1000)).toHaveLength(20);
    expect(await search(alice, "supa crema", 0)).toHaveLength(1);
  });

  it("returns what one serving weighs, so values per 100 g can serve pieces", async () => {
    await db.query(
      `insert into public.foods
         (name, brand, basis, kcal, protein_g, carbs_g, fat_g, serving_label, serving_grams, source)
       values ('Strips Nepicanti', 'KFC', 'per100g', 261, 22.46, 13.33, 13.08, '1 buc.', 30, 'web')`,
    );
    const alice = await createUser(db);
    const { rows } = await asUser(db, alice, (tx) =>
      tx.query<{ serving_label: string; serving_grams: string }>(
        "select serving_label, serving_grams from public.search_foods('kfc strips nepicanti')",
      ),
    );
    expect(rows[0]).toMatchObject({ serving_label: "1 buc." });
    expect(Number(rows[0].serving_grams)).toBe(30);
  });

  it("finds the web values a user saved for themselves, and only for them", async () => {
    const alice = await createUser(db);
    const bob = await createUser(db);
    const name = `Wrap ${randomUUID()}`;
    // What the app saves after the agent reads a shop's page: a private food.
    await asUser(db, alice, (tx) =>
      tx.query(
        `insert into public.foods
           (name, brand, basis, kcal, protein_g, carbs_g, fat_g, source, source_url)
         values ($1, 'Mega Image', 'per100g', 210, 9, 25, 8, 'web', 'https://www.mega-image.ro/p/1')`,
        [name],
      ),
    );

    expect((await search(alice, name)).map((food) => food.name)).toEqual([
      name,
    ]);
    expect(await search(bob, name)).toEqual([]);
  });

  it("stores the brand once, even when the name already includes it", async () => {
    const { rows } = await db.query<{ search_text: string }>(
      "select search_text from public.foods where name = $1",
      ["McDonald's Big Mac"],
    );
    expect(rows[0].search_text).toBe("mcdonalds big mac");
  });

  it("is not open to anonymous visitors", async () => {
    const searchAnonymously = asAnonymous(db, (tx) =>
      tx.query("select * from public.search_foods('kfc')"),
    );
    await expect(searchAnonymously).rejects.toThrow(
      /permission denied for function search_foods/,
    );
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
