-- Fuzzy search over the foods cache, so "ciorba de burta" finds "Ciorbă de
-- burtă" and "Crispy Strips KFC" finds "KFC Crispy Strips". Trigrams (pg_trgm)
-- compare names by their three-letter pieces, so word order, punctuation and
-- small spelling differences barely matter; unaccent removes diacritics first.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- The text a food is searched by: brand and name, lower case, without
-- diacritics or apostrophes ("McDonald's Big Mac" -> "mcdonalds big mac").
-- Immutable, so a generated column and an index can use it: the two-argument
-- unaccent names its dictionary, which keeps the result fixed.
create function public.food_search_text(name text, brand text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select regexp_replace(
    lower(extensions.unaccent(
      'extensions.unaccent'::regdictionary,
      -- The brand only when the name does not already include it.
      case
        when brand is null or strpos(lower(name), lower(brand)) > 0 then name
        else brand || ' ' || name
      end
    )),
    '[''’`]', '', 'g'
  )
$$;

-- Stored, so a search compares against ready-made text. Changing
-- food_search_text later needs the column rebuilt (drop and add it again).
alter table public.foods
  add column search_text text
  generated always as (public.food_search_text(name, brand)) stored;

-- A trigram index, so the % operator below finds candidates without reading
-- every row once the cache holds thousands of foods.
create index foods_search_text_idx on public.foods
  using gin (search_text extensions.gin_trgm_ops);

-- The foods most like `query`, best first, with how alike they are (0 to 1).
-- It runs as the caller (security invoker), so RLS still decides which rows a
-- user sees: the shared catalog and their own foods. The app decides which
-- match is close enough to use.
create function public.search_foods(query text, max_results integer default 5)
returns table (
  id uuid,
  name text,
  brand text,
  basis public.nutrition_basis,
  kcal numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  serving_label text,
  source public.food_source,
  source_url text,
  similarity real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (select public.food_search_text(query, null) as text)
  select
    f.id, f.name, f.brand, f.basis, f.kcal, f.protein_g, f.carbs_g, f.fat_g,
    f.serving_label, f.source, f.source_url,
    extensions.similarity(f.search_text, q.text) as similarity
  from public.foods f, q
  -- % keeps foods above pg_trgm's similarity threshold (0.3 by default).
  where f.search_text operator(extensions.%) q.text
  order by similarity desc, f.name
  -- Callable from the browser through the API, so the size stays bounded.
  limit least(greatest(max_results, 1), 20)
$$;

-- Functions are executable by everyone by default; only signed-in users
-- search, and the generated column needs food_search_text when they add foods.
revoke execute on function public.food_search_text(text, text) from public, anon;
revoke execute on function public.search_foods(text, integer) from public, anon;
grant execute on function public.food_search_text(text, text) to authenticated, service_role;
grant execute on function public.search_foods(text, integer) to authenticated, service_role;
