create extension if not exists postgis with schema extensions;

create table public.financial_service_config (
  key text primary key,
  value jsonb not null
);

insert into public.financial_service_config (key, value) values
  ('report_radius_meters', '50'),
  ('duplicate_window_minutes', '30'),
  ('report_expiry_hours', '{"cash_available": 6, "recently_confirmed": 12, "no_cash": 3, "out_of_service": 24, "partially_available": 4, "crowded": 2, "service_available": 12, "location_closed": 6}'),
  ('xp_rules', '{"accepted": 5, "first_daily": 2, "high_quality": 2, "confirmed_bonus": 3}')
on conflict (key) do update set value = excluded.value;

create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  reputation_score integer not null default 0 check (reputation_score between 0 and 100),
  reports_count integer not null default 0 check (reports_count >= 0),
  accepted_reports_count integer not null default 0 check (accepted_reports_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.financial_services (
  id uuid primary key default gen_random_uuid(),
  external_provider text not null default 'here',
  external_id text not null,
  name text not null,
  logo text,
  location_type text not null check (location_type in ('Bank', 'ATM', 'Financial Service Provider')),
  category_id text,
  category_name text,
  provider text check (provider in ('Fawry', 'Bee', 'Aman', 'Masary', 'Dafaa')),
  service_types text[] not null default '{}',
  primary_service_type text not null,
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  geog extensions.geography(point, 4326) generated always as (
    extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
  ) stored,
  is_open boolean,
  cash_availability_status text not null default 'unknown' check (cash_availability_status in ('available', 'unavailable', 'unknown')),
  current_status text not null default 'unknown' check (current_status in ('unknown', 'cash_available', 'recently_confirmed', 'no_cash', 'out_of_service', 'partially_available', 'crowded', 'service_available', 'location_closed')),
  confidence_score integer check (confidence_score between 0 and 100),
  estimated_success_probability integer check (estimated_success_probability between 0 and 100),
  last_confirmed_at timestamptz,
  phone text,
  website text,
  email text,
  opening_hours jsonb,
  is_active boolean not null default true,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (external_provider, external_id)
);

create index financial_services_geog_idx on public.financial_services using gist (geog);
create index financial_services_active_idx on public.financial_services (is_active, synced_at desc);
create index financial_services_service_types_idx on public.financial_services using gin (service_types);

create table public.financial_service_reports (
  id uuid primary key default gen_random_uuid(),
  financial_service_id uuid not null references public.financial_services(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  reported_status text not null check (reported_status in ('cash_available', 'recently_confirmed', 'no_cash', 'out_of_service', 'partially_available', 'crowded', 'service_available', 'location_closed')),
  failure_reason text check (failure_reason in ('no_cash', 'out_of_service', 'queue_too_long', 'location_closed', 'deposit_only', 'other')),
  note text,
  latitude double precision not null,
  longitude double precision not null,
  geog extensions.geography(point, 4326) generated always as (
    extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
  ) stored,
  distance_meters double precision not null check (distance_meters >= 0),
  is_verified boolean not null default false,
  report_weight numeric(5,2) not null default 1,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, request_id)
);

create index financial_service_reports_location_idx on public.financial_service_reports (financial_service_id, created_at desc);
create index financial_service_reports_user_idx on public.financial_service_reports (user_id, created_at desc);
create index financial_service_reports_expiry_idx on public.financial_service_reports (financial_service_id, expires_at desc);

create table public.financial_service_xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid references public.financial_service_reports(id) on delete cascade,
  event_type text not null check (event_type in ('accepted_report', 'first_daily_report', 'high_quality_report', 'confirmed_bonus')),
  xp integer not null check (xp > 0),
  created_at timestamptz not null default now(),
  unique (user_id, report_id, event_type)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger financial_services_touch_updated_at
before update on public.financial_services
for each row execute function public.touch_updated_at();

create trigger user_profiles_touch_updated_at
before update on public.user_profiles
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

create or replace function public.get_report_config_number(config_key text, fallback numeric)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select value::text::numeric from public.financial_service_config where key = config_key), fallback);
$$;

create or replace function public.get_report_expiry(status text)
returns interval
language sql
stable
security definer
set search_path = public
as $$
  select make_interval(hours => coalesce(
    ((select value from public.financial_service_config where key = 'report_expiry_hours')->>status)::integer,
    6
  ));
$$;

create or replace function public.recalculate_financial_service_reliability(target_service_id uuid)
returns public.financial_services
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  dominant_status text;
  dominant_weight numeric := 0;
  total_weight numeric := 0;
  reporter_count integer := 0;
  confirmed_at timestamptz;
  confidence integer;
  success_probability integer;
  availability text;
  updated_service public.financial_services;
begin
  with latest_per_user as (
    select distinct on (r.user_id)
      r.user_id,
      r.reported_status,
      r.report_weight,
      r.created_at
    from public.financial_service_reports r
    where r.financial_service_id = target_service_id
      and r.expires_at > now()
      and r.is_verified = true
    order by r.user_id, r.created_at desc
  ),
  grouped as (
    select
      reported_status,
      sum(report_weight) as weight,
      count(*) as users,
      max(created_at) as newest
    from latest_per_user
    group by reported_status
    order by weight desc, newest desc
    limit 1
  ),
  totals as (
    select coalesce(sum(report_weight), 0) as weight, count(*) as users, max(created_at) as newest
    from latest_per_user
  )
  select g.reported_status, coalesce(g.weight, 0), t.weight, t.users, t.newest
  into dominant_status, dominant_weight, total_weight, reporter_count, confirmed_at
  from totals t
  left join grouped g on true;

  if dominant_status is null or reporter_count = 0 then
    update public.financial_services
    set current_status = 'unknown',
        cash_availability_status = 'unknown',
        confidence_score = null,
        estimated_success_probability = null,
        last_confirmed_at = null
    where id = target_service_id
    returning * into updated_service;
    return updated_service;
  end if;

  confidence := least(100, greatest(0, round(
    (dominant_weight / greatest(total_weight, 1)) * 70
    + least(reporter_count, 5) * 6
    + greatest(0, 30 - extract(epoch from (now() - confirmed_at)) / 3600)
  )::integer));

  if reporter_count < 2 and dominant_weight < 1.8 then
    dominant_status := 'unknown';
    confidence := least(confidence, 45);
  end if;

  availability := case
    when dominant_status in ('cash_available', 'recently_confirmed', 'service_available') then 'available'
    when dominant_status in ('no_cash', 'out_of_service', 'location_closed') then 'unavailable'
    else 'unknown'
  end;

  success_probability := case
    when dominant_status in ('cash_available', 'recently_confirmed') then least(99, 45 + confidence / 2)
    when dominant_status = 'service_available' then least(90, 40 + confidence / 2)
    when dominant_status = 'partially_available' then least(75, 25 + confidence / 2)
    when dominant_status = 'crowded' then least(65, 20 + confidence / 3)
    when dominant_status = 'unknown' then null
    else greatest(1, 35 - confidence / 3)
  end;

  update public.financial_services
  set current_status = dominant_status,
      cash_availability_status = availability,
      confidence_score = confidence,
      estimated_success_probability = success_probability,
      last_confirmed_at = confirmed_at
  where id = target_service_id
  returning * into updated_service;

  return updated_service;
end;
$$;

create or replace function public.award_report_xp(target_user_id uuid, target_report_id uuid, high_quality boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rules jsonb := (select value from public.financial_service_config where key = 'xp_rules');
  first_today boolean;
  awarded integer := 0;
begin
  insert into public.financial_service_xp_events (user_id, report_id, event_type, xp)
  values (target_user_id, target_report_id, 'accepted_report', coalesce((rules->>'accepted')::integer, 5))
  on conflict do nothing;

  get diagnostics awarded = row_count;

  select not exists (
    select 1
    from public.financial_service_xp_events
    where user_id = target_user_id
      and event_type = 'first_daily_report'
      and created_at::date = now()::date
  ) into first_today;

  if first_today then
    insert into public.financial_service_xp_events (user_id, report_id, event_type, xp)
    values (target_user_id, target_report_id, 'first_daily_report', coalesce((rules->>'first_daily')::integer, 2))
    on conflict do nothing;
  end if;

  if high_quality then
    insert into public.financial_service_xp_events (user_id, report_id, event_type, xp)
    values (target_user_id, target_report_id, 'high_quality_report', coalesce((rules->>'high_quality')::integer, 2))
    on conflict do nothing;
  end if;

  update public.user_profiles
  set xp = coalesce((select sum(xp) from public.financial_service_xp_events where user_id = target_user_id), 0),
      reports_count = reports_count + awarded,
      accepted_reports_count = accepted_reports_count + awarded,
      reputation_score = least(100, reputation_score + case when awarded > 0 then 2 else 0 end),
      level = greatest(1, floor(coalesce((select sum(xp) from public.financial_service_xp_events where user_id = target_user_id), 0) / 100) + 1)
  where user_id = target_user_id;
end;
$$;

create or replace function public.submit_financial_service_report(
  p_financial_service_id uuid,
  p_reported_status text,
  p_failure_reason text,
  p_latitude double precision,
  p_longitude double precision,
  p_request_id uuid,
  p_note text default null
)
returns public.financial_services
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  target_service public.financial_services;
  existing_report public.financial_service_reports;
  new_report_id uuid;
  distance_meters double precision;
  radius_meters numeric := public.get_report_config_number('report_radius_meters', 50);
  duplicate_minutes numeric := public.get_report_config_number('duplicate_window_minutes', 30);
  reporter_reputation integer := 0;
  weight numeric(5,2);
  updated_service public.financial_services;
begin
  if current_user_id is null then
    raise exception 'REPORT_AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  if p_reported_status not in ('cash_available', 'recently_confirmed', 'no_cash', 'out_of_service', 'partially_available', 'crowded', 'service_available', 'location_closed') then
    raise exception 'REPORT_INVALID_STATUS' using errcode = 'P0001';
  end if;

  if p_failure_reason is not null and p_failure_reason not in ('no_cash', 'out_of_service', 'queue_too_long', 'location_closed', 'deposit_only', 'other') then
    raise exception 'REPORT_INVALID_REASON' using errcode = 'P0001';
  end if;

  select * into target_service
  from public.financial_services
  where id = p_financial_service_id and is_active = true
  for update;

  if target_service.id is null then
    raise exception 'REPORT_LOCATION_NOT_FOUND' using errcode = 'P0001';
  end if;

  select * into existing_report
  from public.financial_service_reports
  where user_id = current_user_id and request_id = p_request_id;

  if existing_report.id is not null then
    return public.recalculate_financial_service_reliability(existing_report.financial_service_id);
  end if;

  if exists (
    select 1
    from public.financial_service_reports
    where user_id = current_user_id
      and financial_service_id = p_financial_service_id
      and created_at > now() - make_interval(mins => duplicate_minutes::integer)
  ) then
    raise exception 'REPORT_DUPLICATE' using errcode = 'P0001';
  end if;

  distance_meters := extensions.st_distance(
    target_service.geog,
    extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography
  );

  if distance_meters > radius_meters then
    raise exception 'REPORT_OUTSIDE_RADIUS' using errcode = 'P0001';
  end if;

  insert into public.user_profiles (user_id) values (current_user_id)
  on conflict (user_id) do nothing;

  select reputation_score into reporter_reputation
  from public.user_profiles
  where user_id = current_user_id
  for update;

  weight := least(2.5, 1 + (coalesce(reporter_reputation, 0)::numeric / 100));

  insert into public.financial_service_reports (
    financial_service_id,
    user_id,
    request_id,
    reported_status,
    failure_reason,
    note,
    latitude,
    longitude,
    distance_meters,
    is_verified,
    report_weight,
    expires_at
  )
  values (
    p_financial_service_id,
    current_user_id,
    p_request_id,
    p_reported_status,
    p_failure_reason,
    nullif(left(coalesce(p_note, ''), 500), ''),
    p_latitude,
    p_longitude,
    distance_meters,
    true,
    weight,
    now() + public.get_report_expiry(p_reported_status)
  )
  returning id into new_report_id;

  perform public.award_report_xp(current_user_id, new_report_id, distance_meters <= 15 and p_failure_reason is distinct from 'other');

  updated_service := public.recalculate_financial_service_reliability(p_financial_service_id);
  return updated_service;
end;
$$;

create or replace function public.sync_financial_services_from_provider(payload jsonb)
returns setof public.financial_services
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED' using errcode = 'P0001';
  end if;

  return query
  with incoming as (
    select *
    from jsonb_to_recordset(payload) as x(
      external_provider text,
      external_id text,
      name text,
      logo text,
      location_type text,
      category_id text,
      category_name text,
      provider text,
      service_types text[],
      primary_service_type text,
      address text,
      latitude double precision,
      longitude double precision,
      is_open boolean,
      phone text,
      website text,
      email text,
      opening_hours jsonb
    )
  ),
  upserted as (
    insert into public.financial_services (
      external_provider,
      external_id,
      name,
      logo,
      location_type,
      category_id,
      category_name,
      provider,
      service_types,
      primary_service_type,
      address,
      latitude,
      longitude,
      is_open,
      phone,
      website,
      email,
      opening_hours,
      is_active,
      synced_at
    )
    select
      coalesce(external_provider, 'here'),
      external_id,
      name,
      logo,
      location_type,
      category_id,
      category_name,
      provider,
      service_types,
      primary_service_type,
      address,
      latitude,
      longitude,
      is_open,
      phone,
      website,
      email,
      opening_hours,
      true,
      now()
    from incoming
    on conflict (external_provider, external_id) do update set
      name = excluded.name,
      logo = excluded.logo,
      location_type = excluded.location_type,
      category_id = excluded.category_id,
      category_name = excluded.category_name,
      provider = excluded.provider,
      service_types = excluded.service_types,
      primary_service_type = excluded.primary_service_type,
      address = excluded.address,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      is_open = excluded.is_open,
      phone = excluded.phone,
      website = excluded.website,
      email = excluded.email,
      opening_hours = excluded.opening_hours,
      is_active = true,
      synced_at = now()
    returning public.financial_services.*
  )
  select * from upserted;
end;
$$;

alter table public.financial_services enable row level security;
alter table public.financial_service_reports enable row level security;
alter table public.user_profiles enable row level security;
alter table public.financial_service_xp_events enable row level security;
alter table public.financial_service_config enable row level security;

create policy "active services are readable"
on public.financial_services for select
using (is_active = true);

create policy "users read own reports"
on public.financial_service_reports for select
to authenticated
using (auth.uid() = user_id);

create policy "users read own profile"
on public.user_profiles for select
to authenticated
using (auth.uid() = user_id);

create policy "users update own display name"
on public.user_profiles for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users read own xp events"
on public.financial_service_xp_events for select
to authenticated
using (auth.uid() = user_id);

revoke all on table public.financial_services from anon, authenticated;
revoke all on table public.financial_service_reports from anon, authenticated;
revoke all on table public.user_profiles from anon, authenticated;
revoke all on table public.financial_service_xp_events from anon, authenticated;
revoke all on table public.financial_service_config from anon, authenticated;

grant select on table public.financial_services to anon, authenticated;
grant select on table public.financial_service_reports to authenticated;
grant select, update(display_name) on table public.user_profiles to authenticated;
grant select on table public.financial_service_xp_events to authenticated;
grant execute on function public.submit_financial_service_report(uuid, text, text, double precision, double precision, uuid, text) to authenticated;
grant execute on function public.recalculate_financial_service_reliability(uuid) to service_role;
grant execute on function public.sync_financial_services_from_provider(jsonb) to service_role;
