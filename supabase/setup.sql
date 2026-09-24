-- catloc / Location Shortener: Supabase schema
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- If you already created empty test tables named urls/visits, drop them first:
--   drop table if exists public.visits, public.urls cascade;

-- ---------- Tables ----------

create table if not exists public.urls (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid()
                  references auth.users (id) on delete cascade,
  short_code      text not null unique,
  destination_url text not null,
  created_at      timestamptz not null default now(),
  constraint short_code_format
    check (short_code ~ '^[A-Za-z0-9]{6}$'),          -- matches /api/resolve
  constraint destination_is_http
    check (destination_url ~* '^https?://')           -- blocks javascript: and scheme-less URLs
);

create table if not exists public.visits (
  id          uuid primary key default gen_random_uuid(),
  url_id      uuid not null references public.urls (id) on delete cascade,
  created_at  timestamptz not null default now(),
  latitude    double precision check (latitude  between -90  and 90),
  longitude   double precision check (longitude between -180 and 180),
  accuracy    double precision,      -- browser sends decimals, so not integer
  ip          text,                  -- text, so odd header values can't break inserts
  user_agent  text,
  timezone    text
);

create index if not exists urls_user_id_idx       on public.urls   (user_id);
create index if not exists visits_url_id_idx      on public.visits (url_id);
create index if not exists visits_created_at_idx  on public.visits (created_at desc);

-- ---------- Row Level Security ----------
-- /api/resolve and the log-visit edge function use the service-role key,
-- which bypasses RLS, so anonymous visitors need NO direct table access.

alter table public.urls   enable row level security;
alter table public.visits enable row level security;

drop policy if exists "owners insert own urls" on public.urls;
create policy "owners insert own urls" on public.urls
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "owners read own urls" on public.urls;
create policy "owners read own urls" on public.urls
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "owners delete own urls" on public.urls;
create policy "owners delete own urls" on public.urls
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "owners read visits of own urls" on public.visits;
create policy "owners read visits of own urls" on public.visits
  for select to authenticated
  using (
    exists (
      select 1 from public.urls u
      where u.id = visits.url_id
        and u.user_id = auth.uid()
    )
  );
