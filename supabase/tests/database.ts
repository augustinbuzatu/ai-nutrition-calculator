import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite, type Transaction } from "@electric-sql/pglite";

const migrationsDir = new URL("../migrations/", import.meta.url);

/**
 * Stand-ins for what every Supabase project already has: the anon,
 * authenticated and service_role roles, the auth.users table, and auth.uid(),
 * which reads the signed-in user's id from the request's token.
 */
const supabaseStubs = `
  create role anon nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls;

  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  grant usage on schema public, auth to anon, authenticated, service_role;
  -- Supabase grants these by default; the migrations must narrow them down.
  alter default privileges in schema public
    grant all on tables to anon, authenticated, service_role;
`;

/** A fresh in-memory Postgres (PGlite) with every migration applied in order. */
export async function createTestDatabase(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(supabaseStubs);
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of files) {
    await db.exec(readFileSync(new URL(file, migrationsDir), "utf8"));
  }
  return db;
}

/** Signs up a new user (the trigger creates their profile) and returns their id. */
export async function createUser(db: PGlite): Promise<string> {
  const id = randomUUID();
  await db.query("insert into auth.users (id) values ($1)", [id]);
  return id;
}

/** Runs queries as a signed-in user, the way Supabase runs a request carrying their token. */
export function asUser<T>(
  db: PGlite,
  userId: string,
  run: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [
      userId,
    ]);
    return run(tx);
  });
}

/** Runs queries as a visitor who is not signed in. */
export function asAnonymous<T>(
  db: PGlite,
  run: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec("set local role anon");
    return run(tx);
  });
}
