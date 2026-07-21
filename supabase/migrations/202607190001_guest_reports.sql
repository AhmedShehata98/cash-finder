alter table public.financial_service_reports
  alter column user_id drop not null,
  add column anonymous_installation_id uuid,
  add column reporter_type text;

update public.financial_service_reports
set reporter_type = 'authenticated'
where reporter_type is null;

alter table public.financial_service_reports
  alter column reporter_type set not null,
  add constraint financial_service_reports_reporter_type_check
    check (reporter_type in ('guest', 'authenticated')),
  add constraint financial_service_reports_identity_check
    check (
      (reporter_type = 'authenticated' and user_id is not null and anonymous_installation_id is null)
      or
      (reporter_type = 'guest' and user_id is null and anonymous_installation_id is not null)
    );

alter table public.financial_service_reports
  drop constraint financial_service_reports_user_id_request_id_key;

create unique index financial_service_reports_authenticated_request_idx
  on public.financial_service_reports (user_id, request_id)
  where reporter_type = 'authenticated';

create unique index financial_service_reports_guest_request_idx
  on public.financial_service_reports (anonymous_installation_id, request_id)
  where reporter_type = 'guest';

create index financial_service_reports_guest_idx
  on public.financial_service_reports (anonymous_installation_id, financial_service_id, created_at desc)
  where reporter_type = 'guest';

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
  with latest_per_reporter as (
    select distinct on (r.reporter_type, coalesce(r.user_id, r.anonymous_installation_id))
      r.reporter_type,
      coalesce(r.user_id, r.anonymous_installation_id) as reporter_id,
      r.reported_status,
      r.report_weight,
      r.created_at
    from public.financial_service_reports r
    where r.financial_service_id = target_service_id
      and r.expires_at > now()
      and r.is_verified = true
    order by r.reporter_type, coalesce(r.user_id, r.anonymous_installation_id), r.created_at desc
  ),
  grouped as (
    select
      reported_status,
      sum(report_weight) as weight,
      count(*) as reporters,
      max(created_at) as newest
    from latest_per_reporter
    group by reported_status
    order by weight desc, newest desc
    limit 1
  ),
  totals as (
    select coalesce(sum(report_weight), 0) as weight, count(*) as reporters, max(created_at) as newest
    from latest_per_reporter
  )
  select g.reported_status, coalesce(g.weight, 0), t.weight, t.reporters, t.newest
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

  if reporter_count < 2 then
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

create or replace function public.submit_financial_service_report(
  p_financial_service_id uuid,
  p_reported_status text,
  p_failure_reason text,
  p_latitude double precision,
  p_longitude double precision,
  p_request_id uuid,
  p_note text default null,
  p_anonymous_installation_id uuid default null
)
returns public.financial_services
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  guest_id uuid := case when auth.uid() is null then p_anonymous_installation_id else null end;
  current_reporter_type text := case when auth.uid() is null then 'guest' else 'authenticated' end;
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
  if current_user_id is null and guest_id is null then
    raise exception 'REPORT_IDENTITY_REQUIRED' using errcode = 'P0001';
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
  where request_id = p_request_id
    and (
      (current_user_id is not null and reporter_type = 'authenticated' and user_id = current_user_id)
      or
      (guest_id is not null and reporter_type = 'guest' and anonymous_installation_id = guest_id)
    );

  if existing_report.id is not null then
    return public.recalculate_financial_service_reliability(existing_report.financial_service_id);
  end if;

  if exists (
    select 1
    from public.financial_service_reports
    where financial_service_id = p_financial_service_id
      and created_at > now() - make_interval(mins => duplicate_minutes::integer)
      and (
        (current_user_id is not null and reporter_type = 'authenticated' and user_id = current_user_id)
        or
        (guest_id is not null and reporter_type = 'guest' and anonymous_installation_id = guest_id)
      )
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

  if current_user_id is not null then
    insert into public.user_profiles (user_id) values (current_user_id)
    on conflict (user_id) do nothing;

    select reputation_score into reporter_reputation
    from public.user_profiles
    where user_id = current_user_id
    for update;

    weight := least(2.5, 1 + (coalesce(reporter_reputation, 0)::numeric / 100));
  else
    weight := 0.5;
  end if;

  insert into public.financial_service_reports (
    financial_service_id,
    user_id,
    anonymous_installation_id,
    reporter_type,
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
    guest_id,
    current_reporter_type,
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

  if current_user_id is not null then
    perform public.award_report_xp(current_user_id, new_report_id, distance_meters <= 15 and p_failure_reason is distinct from 'other');
  end if;

  updated_service := public.recalculate_financial_service_reliability(p_financial_service_id);
  return updated_service;
end;
$$;

revoke all on function public.submit_financial_service_report(uuid, text, text, double precision, double precision, uuid, text, uuid) from public;
grant execute on function public.submit_financial_service_report(uuid, text, text, double precision, double precision, uuid, text, uuid) to anon, authenticated;
