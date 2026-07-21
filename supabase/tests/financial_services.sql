begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(39);

select has_table('public', 'financial_services', 'financial_services table exists');
select has_table('public', 'financial_service_reports', 'financial_service_reports table exists');
select has_table('public', 'user_profiles', 'user_profiles table exists');
select has_function('public', 'submit_financial_service_report', 'submit report rpc exists');
select has_function('public', 'sync_financial_services_from_provider', 'provider sync rpc exists');
select policies_are('public', 'financial_services', array['active services are readable']);
select policies_are('public', 'financial_service_reports', array['users read own reports']);
select col_is_unique('public', 'financial_services', array['external_provider', 'external_id'], 'provider external id is unique');

select has_column('public', 'financial_service_reports', 'anonymous_installation_id', 'guest identity column exists');
select has_column('public', 'financial_service_reports', 'reporter_type', 'reporter type column exists');
select col_is_null('public', 'financial_service_reports', 'user_id', 'user id is nullable for guest reports');
select col_has_check('public', 'financial_service_reports', 'reporter_type', 'reporter type is constrained');
select ok(
  has_function_privilege(
    'anon',
    'public.submit_financial_service_report(uuid,text,text,double precision,double precision,uuid,text,uuid)',
    'EXECUTE'
  ),
  'anonymous users can execute the secured report RPC'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.submit_financial_service_report(uuid,text,text,double precision,double precision,uuid,text,uuid)',
    'EXECUTE'
  ),
  'authenticated users can execute the secured report RPC'
);
select ok(not has_table_privilege('anon', 'public.financial_service_reports', 'INSERT'), 'anonymous direct inserts are denied');

insert into public.financial_services (
  id, external_id, name, location_type, service_types, primary_service_type,
  address, latitude, longitude
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'test-service', 'Test ATM', 'ATM',
  array['ATM'], 'ATM', 'Test address', 30.0444, 31.2357
);

set local role anon;

select lives_ok(
  $$select public.submit_financial_service_report(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'cash_available', null,
    30.0444, 31.2357, '11111111-1111-4111-8111-111111111111', null,
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  )$$,
  'guest can submit a proximity-verified report'
);

reset role;

select is(
  (select anonymous_installation_id from public.financial_service_reports where reporter_type = 'guest'),
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
  'guest report stores its anonymous installation id'
);
select is(
  (select report_weight from public.financial_service_reports where reporter_type = 'guest'),
  0.50::numeric,
  'guest report receives weight 0.5'
);
select is(
  (select count(*) from public.financial_service_xp_events),
  0::bigint,
  'guest report receives no XP'
);

set local role anon;
select lives_ok(
  $$select public.submit_financial_service_report(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'cash_available', null,
    30.0444, 31.2357, '11111111-1111-4111-8111-111111111111', null,
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  )$$,
  'replaying the same guest request is idempotent'
);
select throws_ok(
  $$select public.submit_financial_service_report(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'cash_available', null,
    30.0444, 31.2357, '22222222-2222-4222-8222-222222222222', null, null
  )$$,
  'P0001',
  'REPORT_IDENTITY_REQUIRED',
  'guest report without an identity is rejected'
);
select throws_ok(
  $$select public.submit_financial_service_report(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'cash_available', null,
    30.0444, 31.2357, '33333333-3333-4333-8333-333333333333', null,
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  )$$,
  'P0001',
  'REPORT_DUPLICATE',
  'guest duplicate report is rejected'
);
reset role;

select is(
  (select count(*) from public.financial_service_reports where reporter_type = 'guest'),
  1::bigint,
  'guest idempotency does not create another report'
);

insert into auth.users (id) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', true);
set local role authenticated;

select lives_ok(
  $$select public.submit_financial_service_report(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'cash_available', null,
    30.0444, 31.2357, '44444444-4444-4444-8444-444444444444', null,
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  )$$,
  'authenticated user can submit without using the supplied guest identity'
);
select throws_ok(
  $$select public.submit_financial_service_report(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'cash_available', null,
    30.0444, 31.2357, '55555555-5555-4555-8555-555555555555', null, null
  )$$,
  'P0001',
  'REPORT_DUPLICATE',
  'authenticated duplicate report is rejected'
);

reset role;

select is(
  (select user_id from public.financial_service_reports where reporter_type = 'authenticated'),
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid,
  'authenticated report stores auth.uid()'
);
select is(
  (select anonymous_installation_id from public.financial_service_reports where reporter_type = 'authenticated'),
  null::uuid,
  'authenticated report never stores the client guest identity'
);
select ok(
  exists(select 1 from public.financial_service_xp_events where user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  'authenticated report receives XP'
);
select is(
  (select current_status from public.financial_services where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'cash_available',
  'guest and authenticated consensus updates the service status'
);
select ok(
  (select confidence_score is not null from public.financial_services where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'both report types update confidence'
);
select throws_ok(
  $$insert into public.financial_service_reports (
    financial_service_id, user_id, anonymous_installation_id, reporter_type, request_id,
    reported_status, latitude, longitude, distance_meters, is_verified, report_weight, expires_at
  ) values (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated',
    '66666666-6666-4666-8666-666666666666', 'cash_available', 30.0444, 31.2357, 0, true, 1, now() + interval '1 hour'
  )$$,
  'a report cannot contain both identity types'
);

select has_function('public', 'get_financial_service_reliability', 'reliability details rpc exists');
select ok(
  has_function_privilege('anon', 'public.get_financial_service_reliability(uuid)', 'EXECUTE'),
  'anonymous users can read aggregated reliability details'
);

insert into public.financial_services (
  id, external_id, name, location_type, service_types, primary_service_type,
  address, latitude, longitude
) values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'reliability-test', 'Reliability ATM', 'ATM',
  array['ATM'], 'ATM', 'Test address', 30.0444, 31.2357
);

insert into public.financial_service_reports (
  financial_service_id, anonymous_installation_id, reporter_type, request_id,
  reported_status, latitude, longitude, distance_meters, is_verified, report_weight,
  created_at, expires_at
) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'guest',
   '11111111-aaaa-4bbb-8bbb-bbbbbbbbbbbb', 'cash_available', 30.0444, 31.2357, 0, true, 0.5,
   now() - interval '2 hours', now() + interval '2 hours'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'guest',
   '11111111-aaaa-4ccc-8ccc-cccccccccccc', 'no_cash', 30.0444, 31.2357, 0, true, 0.5,
   now() - interval '5 minutes', now() + interval '2 hours'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '22222222-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'guest',
   '22222222-aaaa-4bbb-8bbb-bbbbbbbbbbbb', 'cash_available', 30.0444, 31.2357, 0, false, 0.5,
   now() - interval '10 minutes', now() + interval '2 hours'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '33333333-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'guest',
   '33333333-aaaa-4bbb-8bbb-bbbbbbbbbbbb', 'out_of_service', 30.0444, 31.2357, 0, true, 0.5,
   now() - interval '1 hour', now() - interval '1 minute');

select is(
  (public.get_financial_service_reliability('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')->>'active_reports_count')::integer,
  2,
  'only the latest active report per reporter is counted'
);
select is(
  (public.get_financial_service_reliability('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')->>'verified_reports_count')::integer,
  1,
  'verified report count is aggregated separately'
);
select is(
  (select sum((vote->>'count')::integer) from jsonb_array_elements(
    public.get_financial_service_reliability('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')->'report_vote_distribution'
  ) vote),
  2::bigint,
  'expired and superseded reports are excluded from vote totals'
);
select is(
  (select sum((vote->>'percentage')::integer) from jsonb_array_elements(
    public.get_financial_service_reliability('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')->'report_vote_distribution'
  ) vote),
  100::bigint,
  'vote percentages describe the active distribution'
);
select is(
  jsonb_array_length(public.get_financial_service_reliability('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')->'recent_report_activity'),
  2,
  'recent activity contains only active deduplicated reports'
);
select ok(
  public.get_financial_service_reliability('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')::text
    not like '%anonymous_installation_id%'
  and public.get_financial_service_reliability('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')::text
    not like '%user_id%'
  and public.get_financial_service_reliability('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')::text
    not like '%latitude%',
  'aggregate response contains no private reporter fields'
);

select * from finish();

rollback;
