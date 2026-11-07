-- Who may use the AI, and how much. Every call costs money and anyone can
-- sign up, so the database decides, in one place no request can get around:
-- only accounts the owner approves, within daily limits per user and for
-- everyone together. Users cannot read or write these tables; they only call
-- the two functions at the end. The owner edits them in the Supabase
-- dashboard (Table Editor), which bypasses row level security.

create type public.ai_use as enum ('description', 'lookup');

-- Approved accounts. Not a column in profiles: users may update their own
-- profile, and would turn this on themselves.
create table public.ai_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Who this is, for whoever reads the table: "Mama", "Demo account".
  note text,
  approved_at timestamptz not null default now()
);

-- The daily limits, in one row the owner can change without a deploy. One
-- description costs about 0.03 US cents, one web lookup 1.5 to 5 cents.
create table public.ai_limits (
  only_row boolean primary key default true check (only_row),
  descriptions_per_user integer not null default 30 check (descriptions_per_user >= 0),
  lookups_per_user integer not null default 10 check (lookups_per_user >= 0),
  descriptions_per_day integer not null default 200 check (descriptions_per_day >= 0),
  lookups_per_day integer not null default 20 check (lookups_per_day >= 0)
);
insert into public.ai_limits default values;

-- Uses per day and kind: one row per user, and one with no user for everyone
-- together ("nulls not distinct" keeps that row unique too).
create table public.ai_usage (
  day date not null,
  kind public.ai_use not null,
  user_id uuid references auth.users (id) on delete cascade,
  uses integer not null default 0 check (uses >= 0),
  unique nulls not distinct (day, kind, user_id)
);

revoke all on public.ai_access, public.ai_limits, public.ai_usage from anon, authenticated;
alter table public.ai_access enable row level security;
alter table public.ai_limits enable row level security;
alter table public.ai_usage enable row level security;
-- No policies: only the functions below, which run as their owner, and the
-- dashboard reach these rows.

-- The day the limits count, the same for everyone: the users are in Romania.
create function public.ai_day()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Europe/Bucharest')::date
$$;

-- Whether the signed-in user may use the AI, and how many uses are left
-- today: the smaller of their own and everyone's.
create function public.ai_allowance()
returns table (approved boolean, descriptions_left integer, lookups_left integer)
language sql
stable
security definer
set search_path = ''
as $$
  with used as (
    select kind, user_id, uses from public.ai_usage where day = public.ai_day()
  )
  select
    exists (select 1 from public.ai_access where user_id = (select auth.uid())),
    greatest(0, least(
      l.descriptions_per_user - coalesce((select uses from used
        where kind = 'description' and user_id = (select auth.uid())), 0),
      l.descriptions_per_day - coalesce((select uses from used
        where kind = 'description' and user_id is null), 0)
    )),
    greatest(0, least(
      l.lookups_per_user - coalesce((select uses from used
        where kind = 'lookup' and user_id = (select auth.uid())), 0),
      l.lookups_per_day - coalesce((select uses from used
        where kind = 'lookup' and user_id is null), 0)
    ))
  from public.ai_limits l
$$;

-- Takes one use of the AI for the signed-in user, before the call is made:
-- 'ok', or why not ('not_approved', 'user_limit', 'daily_limit').
create function public.use_ai(use_kind public.ai_use)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  today date := public.ai_day();
  limits public.ai_limits;
  per_user integer;
  per_day integer;
begin
  if me is null or not exists (select 1 from public.ai_access where user_id = me) then
    return 'not_approved';
  end if;
  select * into limits from public.ai_limits;
  if use_kind = 'description' then
    per_user := limits.descriptions_per_user;
    per_day := limits.descriptions_per_day;
  else
    per_user := limits.lookups_per_user;
    per_day := limits.lookups_per_day;
  end if;

  insert into public.ai_usage (day, kind, user_id)
  values (today, use_kind, null), (today, use_kind, me)
  on conflict do nothing;

  -- Each update counts only below its limit, and locks its row, so two
  -- requests at once can never both take the last use.
  update public.ai_usage set uses = uses + 1
  where day = today and kind = use_kind and user_id is null and uses < per_day;
  if not found then
    return 'daily_limit';
  end if;
  update public.ai_usage set uses = uses + 1
  where day = today and kind = use_kind and user_id = me and uses < per_user;
  if not found then
    -- Give back the use counted for everyone.
    update public.ai_usage set uses = uses - 1
    where day = today and kind = use_kind and user_id is null;
    return 'user_limit';
  end if;
  return 'ok';
end;
$$;

-- Functions are executable by everyone by default: only signed-in users call
-- these two, and ai_day is for them alone.
revoke execute on function public.ai_day() from public, anon, authenticated;
revoke execute on function public.ai_allowance() from public, anon;
revoke execute on function public.use_ai(public.ai_use) from public, anon;
grant execute on function public.ai_allowance() to authenticated;
grant execute on function public.use_ai(public.ai_use) to authenticated;
