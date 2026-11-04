-- search_foods also returns what one serving weighs or holds, so values
-- published per 100 g can serve food counted in pieces: KFC publishes its
-- strips per 100 g, and one strip as 30 g. A function's result type cannot
-- change in place, so it is dropped and created again, with its grants.

drop function public.search_foods(text, integer);

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
  serving_grams numeric,
  serving_ml numeric,
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
    f.serving_label, f.serving_grams, f.serving_ml, f.source, f.source_url,
    extensions.similarity(f.search_text, q.text) as similarity
  from public.foods f, q
  -- % keeps foods above pg_trgm's similarity threshold (0.3 by default).
  where f.search_text operator(extensions.%) q.text
  order by similarity desc, f.name
  -- Callable from the browser through the API, so the size stays bounded.
  limit least(greatest(max_results, 1), 20)
$$;

revoke execute on function public.search_foods(text, integer) from public, anon;
grant execute on function public.search_foods(text, integer) to authenticated, service_role;
