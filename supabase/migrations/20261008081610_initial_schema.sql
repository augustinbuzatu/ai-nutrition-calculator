-- Initial schema: user profiles, a food catalog and the daily food diary.
-- Every table has row level security (RLS), so each user only reaches their own data.

-- Enums mirror the Zod schemas in src/lib/nutrition/schemas.ts.
create type public.nutrition_basis as enum ('per100g', 'per100ml', 'perServing');
create type public.quantity_unit as enum ('g', 'kg', 'ml', 'l', 'serving');
create type public.food_source as enum ('usda', 'openfoodfacts', 'web', 'ai_estimate', 'user');

-- ---------------------------------------------------------------------------
-- Profiles: one row per user, created by a trigger at sign-up.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Null until the user finishes onboarding; the app sends them there while null.
  daily_kcal_goal integer check (daily_kcal_goal between 800 and 10000),
  daily_protein_goal integer check (daily_protein_goal between 10 and 500),
  -- Decides which calendar day a meal belongs to.
  timezone text not null default 'Europe/Bucharest',
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
-- Runs with the owner's rights to insert the profile; an empty search_path
-- stops a malicious object from shadowing public.profiles.
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Foods: nutrition facts as their source publishes them (the cache from
-- Etapa 5). Rows without created_by form the shared catalog, written only by
-- the server; rows with created_by are a user's private foods.
-- ---------------------------------------------------------------------------
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  brand text,
  basis public.nutrition_basis not null,
  kcal numeric(10, 3) not null check (kcal >= 0),
  protein_g numeric(10, 3) not null check (protein_g >= 0),
  carbs_g numeric(10, 3) not null check (carbs_g >= 0),
  fat_g numeric(10, 3) not null check (fat_g >= 0),
  serving_label text,
  serving_grams numeric(10, 3) check (serving_grams > 0),
  serving_ml numeric(10, 3) check (serving_ml > 0),
  source public.food_source not null,
  source_url text,
  created_by uuid default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Same rule as the Zod schema: per-serving values must say what the serving is.
  constraint per_serving_needs_label check (basis <> 'perServing' or serving_label is not null)
);

-- ---------------------------------------------------------------------------
-- Food entries: the diary. Each row is a snapshot of what was eaten, so later
-- edits to a catalog food never rewrite a user's history.
-- ---------------------------------------------------------------------------
create table public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- The diary day in the user's timezone, set by the app (not derived from created_at).
  entry_date date not null,
  food_id uuid references public.foods (id) on delete set null,
  name text not null check (length(trim(name)) > 0),
  quantity numeric(10, 3) not null check (quantity > 0),
  unit public.quantity_unit not null,
  -- Unrounded values from the calculator; rounding happens only for display.
  kcal numeric(10, 3) not null check (kcal >= 0),
  protein_g numeric(10, 3) not null check (protein_g >= 0),
  carbs_g numeric(10, 3) not null check (carbs_g >= 0),
  fat_g numeric(10, 3) not null check (fat_g >= 0),
  -- What the user typed, kept for debugging and for evaluating the AI parser.
  raw_input text,
  created_at timestamptz not null default now()
);

-- The dashboard asks for "this user's entries on this day" all the time.
create index food_entries_user_id_entry_date_idx on public.food_entries (user_id, entry_date);

-- ---------------------------------------------------------------------------
-- Privileges: signed-in users get only the operations the app needs;
-- anonymous visitors get nothing. RLS then narrows each operation to rows.
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.foods, public.food_entries from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.foods to authenticated;
grant select, insert, update, delete on public.food_entries to authenticated;

alter table public.profiles enable row level security;
alter table public.foods enable row level security;
alter table public.food_entries enable row level security;

-- (select auth.uid()) instead of auth.uid(): Postgres evaluates it once per
-- query instead of once per row.
create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Users can read the shared catalog and their own foods"
  on public.foods for select to authenticated
  using (created_by is null or created_by = (select auth.uid()));

create policy "Users can add their own foods"
  on public.foods for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "Users can update their own foods"
  on public.foods for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy "Users can delete their own foods"
  on public.foods for delete to authenticated
  using (created_by = (select auth.uid()));

create policy "Users can read their own entries"
  on public.food_entries for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can add their own entries"
  on public.food_entries for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own entries"
  on public.food_entries for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own entries"
  on public.food_entries for delete to authenticated
  using (user_id = (select auth.uid()));
