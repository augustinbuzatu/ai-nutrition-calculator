import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  asAnonymous,
  asUser,
  createTestDatabase,
  createUser,
} from "./database";

// Who may use the AI, and how much: the owner approves accounts in the
// dashboard (here, the superuser connection), users only call use_ai and
// ai_allowance.
let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase();
}, 30_000);

afterAll(async () => {
  await db.close();
});

beforeEach(async () => {
  // The limits and the counts are shared by every user: start each test clean.
  await db.exec(`
    delete from public.ai_usage;
    update public.ai_limits set descriptions_per_user = 30, lookups_per_user = 10,
      descriptions_per_day = 200, lookups_per_day = 20;
  `);
});

async function approvedUser(): Promise<string> {
  const id = await createUser(db);
  await db.query(
    "insert into public.ai_access (user_id, note) values ($1, 'test')",
    [id],
  );
  return id;
}

function useAi(userId: string, kind: "description" | "lookup" = "description") {
  return asUser(db, userId, (tx) =>
    tx.query<{ use_ai: string }>("select public.use_ai($1)", [kind]),
  ).then((result) => result.rows[0].use_ai);
}

function allowance(userId: string) {
  return asUser(db, userId, (tx) =>
    tx.query<{
      approved: boolean;
      descriptions_left: number;
      lookups_left: number;
    }>("select * from public.ai_allowance()"),
  ).then((result) => result.rows[0]);
}

function setLimits(limits: string) {
  return db.exec(`update public.ai_limits set ${limits}`);
}

describe("AI access", () => {
  it.each(["ai_access", "ai_limits", "ai_usage"])(
    "keeps %s away from users, who only call the functions",
    async (table) => {
      const alice = await approvedUser();
      const read = asUser(db, alice, (tx) =>
        tx.query(`select * from public.${table}`),
      );
      await expect(read).rejects.toThrow(/permission denied/);
    },
  );

  it("does not let a user approve themselves", async () => {
    const mallory = await createUser(db);
    const approve = asUser(db, mallory, (tx) =>
      tx.query("insert into public.ai_access (user_id) values (auth.uid())"),
    );
    await expect(approve).rejects.toThrow(/permission denied/);
    expect(await useAi(mallory)).toBe("not_approved");
  });

  it("gives no AI to an account the owner has not approved", async () => {
    const bob = await createUser(db);
    expect(await useAi(bob)).toBe("not_approved");
    expect(await allowance(bob)).toMatchObject({ approved: false });
  });

  it("counts each user's uses up to their daily limit, kind by kind", async () => {
    await setLimits("descriptions_per_user = 2");
    const alice = await approvedUser();
    expect(await allowance(alice)).toEqual({
      approved: true,
      descriptions_left: 2,
      lookups_left: 10,
    });

    expect(await useAi(alice)).toBe("ok");
    expect(await useAi(alice)).toBe("ok");
    expect(await useAi(alice)).toBe("user_limit");
    // Lookups have their own limit.
    expect(await useAi(alice, "lookup")).toBe("ok");
    expect(await allowance(alice)).toEqual({
      approved: true,
      descriptions_left: 0,
      lookups_left: 9,
    });
  });

  it("stops everyone together at the daily limit", async () => {
    await setLimits("descriptions_per_user = 2, descriptions_per_day = 3");
    const alice = await approvedUser();
    const bob = await approvedUser();

    expect(await useAi(alice)).toBe("ok");
    expect(await useAi(alice)).toBe("ok");
    expect(await useAi(bob)).toBe("ok");
    expect(await useAi(bob)).toBe("daily_limit");
    // Bob has one use of his own left, but none is left for everyone.
    expect(await allowance(bob)).toMatchObject({ descriptions_left: 0 });
  });

  it("does not count a use refused by a user's own limit against everyone", async () => {
    await setLimits("descriptions_per_user = 1, descriptions_per_day = 2");
    const alice = await approvedUser();
    const bob = await approvedUser();

    expect(await useAi(alice)).toBe("ok");
    expect(await useAi(alice)).toBe("user_limit");
    expect(await useAi(alice)).toBe("user_limit");
    // Alice's refused tries left room for Bob.
    expect(await useAi(bob)).toBe("ok");
  });

  it("starts each day afresh", async () => {
    await setLimits("descriptions_per_user = 1");
    const alice = await approvedUser();
    await db.query(
      `insert into public.ai_usage (day, kind, user_id, uses) values
         (public.ai_day() - 1, 'description', $1, 1),
         (public.ai_day() - 1, 'description', null, 500)`,
      [alice],
    );
    expect(await useAi(alice)).toBe("ok");
  });

  it("follows limits the owner changes, with no deploy", async () => {
    const alice = await approvedUser();
    await setLimits("lookups_per_user = 0");
    expect(await useAi(alice, "lookup")).toBe("user_limit");
    expect(await allowance(alice)).toMatchObject({ lookups_left: 0 });
  });

  it.each([
    "select public.use_ai('description')",
    "select * from public.ai_allowance()",
  ])("refuses anonymous visitors: %s", async (query) => {
    const call = asAnonymous(db, (tx) => tx.query(query));
    await expect(call).rejects.toThrow(/permission denied for function/);
  });
});
