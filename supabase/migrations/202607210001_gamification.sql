create extension if not exists pgcrypto with schema extensions;

create table public.gamification_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.gamification_config (key, value) values
  ('level_thresholds', '[0,50,150,300,500,800,1200,1700,2300,3000]'),
  ('xp_rules', '{"accepted_report":5,"repeat_location":1,"first_daily":2,"confirmation":3,"high_quality":2,"fresh_location":3,"seven_day_streak":10,"daily_reward_limit":20}'),
  ('abuse_rules', '{"repeat_location_hours":6,"maximum_speed_kph":250,"minimum_travel_km":10}'),
  ('application_timezone', '"Africa/Cairo"')
on conflict (key) do update set value = excluded.value, updated_at = now();

alter table public.user_profiles
  add column if not exists avatar_url text,
  add column if not exists verified_reports_count integer not null default 0 check (verified_reports_count >= 0),
  add column if not exists helpful_reports_count integer not null default 0 check (helpful_reports_count >= 0),
  add column if not exists current_streak integer not null default 0 check (current_streak >= 0),
  add column if not exists longest_streak integer not null default 0 check (longest_streak >= 0),
  add column if not exists last_contribution_date date,
  add column if not exists show_on_leaderboard boolean not null default false;

update public.user_profiles
set verified_reports_count = greatest(verified_reports_count, accepted_reports_count),
    reputation_score = case when reports_count = 0 and reputation_score = 0 then 50 else reputation_score end;

alter table public.user_profiles alter column reputation_score set default 50;

create table public.guest_profiles (
  id uuid primary key default gen_random_uuid(),
  anonymous_installation_id uuid not null unique,
  claim_token_hash bytea not null,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  reputation_score integer not null default 50 check (reputation_score between 0 and 100),
  reports_count integer not null default 0 check (reports_count >= 0),
  verified_reports_count integer not null default 0 check (verified_reports_count >= 0),
  helpful_reports_count integer not null default 0 check (helpful_reports_count >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_contribution_date date,
  is_claimed boolean not null default false,
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guest_profile_claim_check check (
    (not is_claimed and claimed_by_user_id is null and claimed_at is null)
    or (is_claimed and claimed_by_user_id is not null and claimed_at is not null)
  )
);

create table public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  guest_profile_id uuid references public.guest_profiles(id) on delete cascade,
  amount integer not null check (amount > 0),
  reason text not null,
  source_type text not null check (source_type in ('report','report_confirmation','achievement','badge','streak','system_adjustment')),
  source_id uuid not null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  constraint xp_transaction_owner_check check ((user_id is not null)::integer + (guest_profile_id is not null)::integer = 1),
  unique (source_type, source_id, reason)
);

insert into public.xp_transactions (id, user_id, amount, reason, source_type, source_id, created_at)
select id, user_id, xp, event_type, 'report', coalesce(report_id, id), created_at
from public.financial_service_xp_events
on conflict do nothing;

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  icon_key text not null,
  category text not null,
  requirement_type text not null,
  requirement_value integer not null check (requirement_value > 0),
  xp_reward integer not null default 0 check (xp_reward >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_badges (
  id uuid primary key default gen_random_uuid(),
  badge_id uuid not null references public.badges(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  guest_profile_id uuid references public.guest_profiles(id) on delete cascade,
  earned_at timestamptz not null default now(),
  progress integer not null default 0 check (progress >= 0),
  reward_claimed boolean not null default false,
  constraint profile_badge_owner_check check ((user_id is not null)::integer + (guest_profile_id is not null)::integer = 1)
);

create unique index profile_badges_user_unique on public.profile_badges (badge_id, user_id) where user_id is not null;
create unique index profile_badges_guest_unique on public.profile_badges (badge_id, guest_profile_id) where guest_profile_id is not null;

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null,
  requirement_type text not null,
  target integer not null check (target > 0),
  xp_reward integer not null default 0 check (xp_reward >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_achievements (
  id uuid primary key default gen_random_uuid(),
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  guest_profile_id uuid references public.guest_profiles(id) on delete cascade,
  current_progress integer not null default 0 check (current_progress >= 0),
  is_completed boolean not null default false,
  completed_at timestamptz,
  reward_claimed boolean not null default false,
  constraint profile_achievement_owner_check check ((user_id is not null)::integer + (guest_profile_id is not null)::integer = 1),
  constraint profile_achievement_completion_check check (is_completed = (completed_at is not null))
);

create unique index profile_achievements_user_unique on public.profile_achievements (achievement_id, user_id) where user_id is not null;
create unique index profile_achievements_guest_unique on public.profile_achievements (achievement_id, guest_profile_id) where guest_profile_id is not null;

alter table public.financial_service_reports
  add column if not exists original_guest_profile_id uuid references public.guest_profiles(id) on delete set null,
  add column if not exists is_reward_eligible boolean not null default true,
  add column if not exists is_first_recent_report boolean not null default false,
  add column if not exists community_confirmed_at timestamptz;

create table public.report_confirmations (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.financial_service_reports(id) on delete cascade,
  confirming_report_id uuid not null references public.financial_service_reports(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (report_id <> confirming_report_id),
  unique (report_id, confirming_report_id)
);

create table public.gamification_abuse_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  guest_profile_id uuid references public.guest_profiles(id) on delete cascade,
  event_type text not null,
  points integer not null default 0 check (points >= 0),
  source_id uuid,
  created_at timestamptz not null default now(),
  constraint abuse_event_owner_check check ((user_id is not null)::integer + (guest_profile_id is not null)::integer = 1)
);

create index xp_transactions_user_period_idx on public.xp_transactions (user_id, created_at desc) where user_id is not null;
create index xp_transactions_guest_idx on public.xp_transactions (guest_profile_id, created_at desc) where guest_profile_id is not null;
create index report_confirmations_report_idx on public.report_confirmations (report_id, created_at);
create index reports_original_guest_idx on public.financial_service_reports (original_guest_profile_id, created_at desc) where original_guest_profile_id is not null;
create index abuse_events_user_period_idx on public.gamification_abuse_events (user_id, created_at desc) where user_id is not null;

insert into public.badges (code, name, description, icon_key, category, requirement_type, requirement_value, xp_reward) values
  ('first_contribution','First Contribution','Submit your first valid report.','sparkles','contribution','reports_count',1,10),
  ('local_helper','Local Helper','Submit 10 valid reports.','map-pin','contribution','reports_count',10,25),
  ('trusted_reporter','Trusted Reporter','Reach a reputation score of 70.','shield-check','trust','reputation_score',70,40),
  ('community_expert','Community Expert','Submit 100 valid reports.','award','contribution','reports_count',100,100),
  ('fresh_data_hero','Fresh Data Hero','Report 20 locations with no recent data.','refresh','quality','fresh_reports_count',20,50),
  ('consistency_matters','Consistency Matters','Maintain a seven-day contribution streak.','flame','streak','longest_streak',7,40),
  ('atm_explorer','ATM Explorer','Report at 10 different ATM locations.','compass','exploration','atm_locations_count',10,30),
  ('financial_services_explorer','Financial Services Explorer','Report across three financial service types.','wallet','exploration','service_types_count',3,30),
  ('verified_contributor','Verified Contributor','Receive confirmations on 25 reports.','badge-check','trust','helpful_reports_count',25,50),
  ('top_contributor','Top Contributor','Reach the weekly leaderboard top 10.','crown','leaderboard','weekly_top_ten',1,100)
on conflict (code) do update set name=excluded.name, description=excluded.description, icon_key=excluded.icon_key,
  category=excluded.category, requirement_type=excluded.requirement_type, requirement_value=excluded.requirement_value,
  xp_reward=excluded.xp_reward, is_active=true, updated_at=now();

insert into public.achievements (code, title, description, requirement_type, target, xp_reward) values
  ('five_reports','Getting Started','Submit 5 valid reports.','reports_count',5,10),
  ('twenty_five_reports','Community Regular','Submit 25 valid reports.','reports_count',25,25),
  ('five_days','Five Helpful Days','Submit reports on 5 different days.','contribution_days',5,15),
  ('cash_available_ten','Cash Finder','Confirm cash availability at 10 locations.','cash_locations_count',10,20),
  ('ten_locations','Explorer','Report 10 different locations.','locations_count',10,25),
  ('level_five','Level Five','Reach level 5.','level',5,50),
  ('reputation_eighty','Highly Trusted','Reach reputation 80.','reputation_score',80,50)
on conflict (code) do update set title=excluded.title, description=excluded.description,
  requirement_type=excluded.requirement_type, target=excluded.target, xp_reward=excluded.xp_reward,
  is_active=true, updated_at=now();

create or replace function public.gamification_level_for_xp(p_xp integer)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(max(ordinality), 1)::integer
  from jsonb_array_elements_text((select value from public.gamification_config where key='level_thresholds')) with ordinality t(value, ordinality)
  where value::integer <= greatest(p_xp, 0);
$$;

create or replace function public.gamification_level_progress(p_xp integer)
returns jsonb language sql stable security definer set search_path = public as $$
  with thresholds as (
    select value::integer threshold, ordinality::integer level
    from jsonb_array_elements_text((select value from public.gamification_config where key='level_thresholds')) with ordinality t(value, ordinality)
  ), current_level as (select public.gamification_level_for_xp(p_xp) level)
  select jsonb_build_object(
    'level', c.level, 'currentXp', greatest(p_xp,0),
    'currentLevelXp', coalesce((select threshold from thresholds where level=c.level),0),
    'nextLevelXp', (select threshold from thresholds where level=c.level+1),
    'progressPercentage', case when (select threshold from thresholds where level=c.level+1) is null then 100 else
      least(100, greatest(0, round((greatest(p_xp,0)-(select threshold from thresholds where level=c.level))*100.0 /
      nullif((select threshold from thresholds where level=c.level+1)-(select threshold from thresholds where level=c.level),0)))) end
  ) from current_level c;
$$;

create or replace function public.verify_guest_profile(p_installation_id uuid, p_claim_token text)
returns uuid language sql stable security definer set search_path = public, extensions as $$
  select id from public.guest_profiles
  where anonymous_installation_id=p_installation_id
    and claim_token_hash=extensions.digest(p_claim_token,'sha256');
$$;

create or replace function public.profile_metric(
  p_requirement text, p_user_id uuid, p_guest_profile_id uuid
) returns integer language plpgsql stable security definer set search_path = public as $$
declare result integer := 0;
begin
  if p_requirement in ('reports_count','reputation_score','longest_streak','helpful_reports_count','level') then
    if p_user_id is not null then
      execute format('select %I from public.user_profiles where user_id=$1', p_requirement) into result using p_user_id;
    else
      execute format('select %I from public.guest_profiles where id=$1', p_requirement) into result using p_guest_profile_id;
    end if;
  elsif p_requirement='contribution_days' then
    select count(distinct (r.created_at at time zone 'Africa/Cairo')::date)::integer into result from public.financial_service_reports r
      where (r.user_id=p_user_id or r.original_guest_profile_id=p_guest_profile_id or (p_guest_profile_id is not null and r.anonymous_installation_id=(select anonymous_installation_id from public.guest_profiles where id=p_guest_profile_id)));
  elsif p_requirement in ('locations_count','atm_locations_count','cash_locations_count','fresh_reports_count') then
    select count(distinct r.financial_service_id)::integer into result
    from public.financial_service_reports r join public.financial_services f on f.id=r.financial_service_id
    where (r.user_id=p_user_id or r.original_guest_profile_id=p_guest_profile_id or (p_guest_profile_id is not null and r.anonymous_installation_id=(select anonymous_installation_id from public.guest_profiles where id=p_guest_profile_id)))
      and (p_requirement<>'atm_locations_count' or 'ATM'=any(f.service_types))
      and (p_requirement<>'cash_locations_count' or r.reported_status in ('cash_available','recently_confirmed'))
      and (p_requirement<>'fresh_reports_count' or r.is_first_recent_report);
  elsif p_requirement='service_types_count' then
    select count(distinct service_type)::integer into result
    from public.financial_service_reports r join public.financial_services f on f.id=r.financial_service_id cross join unnest(f.service_types) service_type
    where (r.user_id=p_user_id or r.original_guest_profile_id=p_guest_profile_id or (p_guest_profile_id is not null and r.anonymous_installation_id=(select anonymous_installation_id from public.guest_profiles where id=p_guest_profile_id)));
  end if;
  return coalesce(result,0);
end;
$$;

create or replace function public.recalculate_gamification_profile(p_user_id uuid, p_guest_profile_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare total_xp integer; report_count integer; helpful_count integer; contribution_date date; current_run integer := 0; longest_run integer := 0; previous_date date; d date; abuse integer; evaluated integer; agreements integer; agreement_rate numeric; reputation integer;
begin
  select coalesce(sum(amount),0) into total_xp from public.xp_transactions where user_id=p_user_id or guest_profile_id=p_guest_profile_id;
  select count(*)::integer, count(*) filter (where community_confirmed_at is not null)::integer, max((created_at at time zone 'Africa/Cairo')::date)
  into report_count, helpful_count, contribution_date from public.financial_service_reports
  where user_id=p_user_id or original_guest_profile_id=p_guest_profile_id or (p_guest_profile_id is not null and anonymous_installation_id=(select anonymous_installation_id from public.guest_profiles where id=p_guest_profile_id));
  for d in select distinct (created_at at time zone 'Africa/Cairo')::date from public.financial_service_reports
    where user_id=p_user_id or original_guest_profile_id=p_guest_profile_id or (p_guest_profile_id is not null and anonymous_installation_id=(select anonymous_installation_id from public.guest_profiles where id=p_guest_profile_id)) order by 1
  loop
    if previous_date is null or d=previous_date+1 then current_run:=current_run+1; else current_run:=1; end if;
    longest_run:=greatest(longest_run,current_run); previous_date:=d;
  end loop;
  if contribution_date is null or contribution_date < (now() at time zone 'Africa/Cairo')::date-1 then current_run:=0; end if;
  select count(*)::integer, count(*) filter (where rc.id is not null)::integer into evaluated, agreements
  from public.financial_service_reports r left join public.report_confirmations rc on rc.report_id=r.id
  where r.user_id=p_user_id or r.original_guest_profile_id=p_guest_profile_id or (p_guest_profile_id is not null and r.anonymous_installation_id=(select anonymous_installation_id from public.guest_profiles where id=p_guest_profile_id));
  select coalesce(sum(points),0)::integer into abuse from public.gamification_abuse_events where (user_id=p_user_id or guest_profile_id=p_guest_profile_id) and created_at>now()-interval '90 days';
  agreement_rate := (agreements+2.0)/(evaluated+4.0);
  reputation := least(100,greatest(0,round(50+50*(agreement_rate-0.5)+least(10,report_count/5.0)+least(10,longest_run/3.0)+least(5,helpful_count/4.0)-least(30,abuse))));
  if p_user_id is not null then
    update public.user_profiles set xp=total_xp, level=public.gamification_level_for_xp(total_xp), reputation_score=reputation,
      reports_count=report_count, verified_reports_count=report_count, helpful_reports_count=helpful_count,
      current_streak=current_run, longest_streak=longest_run, last_contribution_date=contribution_date where user_id=p_user_id;
  else
    update public.guest_profiles set xp=total_xp, level=public.gamification_level_for_xp(total_xp), reputation_score=reputation,
      reports_count=report_count, verified_reports_count=report_count, helpful_reports_count=helpful_count,
      current_streak=current_run, longest_streak=longest_run, last_contribution_date=contribution_date where id=p_guest_profile_id;
  end if;
end;
$$;

create or replace function public.evaluate_profile_rewards(p_user_id uuid, p_guest_profile_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b public.badges; a public.achievements; metric integer; ownership_id uuid; unlocked jsonb := '[]'; completed jsonb := '[]';
begin
  for b in select * from public.badges where is_active and requirement_type<>'weekly_top_ten' loop
    metric:=public.profile_metric(b.requirement_type,p_user_id,p_guest_profile_id);
    if metric>=b.requirement_value then
      insert into public.profile_badges (badge_id,user_id,guest_profile_id,progress) values (b.id,p_user_id,p_guest_profile_id,metric)
      on conflict do nothing returning id into ownership_id;
      if ownership_id is not null then
        insert into public.xp_transactions (user_id,guest_profile_id,amount,reason,source_type,source_id)
        select p_user_id,p_guest_profile_id,b.xp_reward,'badge:'||b.code,'badge',ownership_id where b.xp_reward>0 on conflict do nothing;
        unlocked:=unlocked||jsonb_build_array(jsonb_build_object('code',b.code,'name',b.name,'iconKey',b.icon_key,'xpReward',b.xp_reward));
      else
        update public.profile_badges set progress=greatest(progress,metric) where badge_id=b.id and (user_id=p_user_id or guest_profile_id=p_guest_profile_id);
      end if;
      ownership_id:=null;
    end if;
  end loop;
  perform public.recalculate_gamification_profile(p_user_id,p_guest_profile_id);
  for a in select * from public.achievements where is_active loop
    metric:=public.profile_metric(a.requirement_type,p_user_id,p_guest_profile_id);
    insert into public.profile_achievements (achievement_id,user_id,guest_profile_id,current_progress,is_completed,completed_at)
    values (a.id,p_user_id,p_guest_profile_id,least(metric,a.target),metric>=a.target,case when metric>=a.target then now() end)
    on conflict do nothing returning id into ownership_id;
    if ownership_id is not null and metric>=a.target then
      insert into public.xp_transactions (user_id,guest_profile_id,amount,reason,source_type,source_id)
      select p_user_id,p_guest_profile_id,a.xp_reward,'achievement:'||a.code,'achievement',ownership_id where a.xp_reward>0 on conflict do nothing;
      completed:=completed||jsonb_build_array(jsonb_build_object('code',a.code,'title',a.title,'xpReward',a.xp_reward));
    else
      update public.profile_achievements set current_progress=greatest(current_progress,least(metric,a.target)),
        is_completed=is_completed or metric>=a.target, completed_at=case when is_completed then completed_at when metric>=a.target then now() else null end
      where achievement_id=a.id and (user_id=p_user_id or guest_profile_id=p_guest_profile_id);
    end if;
    ownership_id:=null;
  end loop;
  perform public.recalculate_gamification_profile(p_user_id,p_guest_profile_id);
  return jsonb_build_object('badges',unlocked,'achievements',completed);
end;
$$;

create or replace function public.gamification_summary_json(p_user_id uuid, p_guest_profile_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with p as (
    select user_id,display_name,avatar_url,xp,level,reputation_score,reports_count,verified_reports_count,helpful_reports_count,current_streak,longest_streak,last_contribution_date,show_on_leaderboard,false is_guest
    from public.user_profiles where user_id=p_user_id
    union all
    select null,'Guest',null,xp,level,reputation_score,reports_count,verified_reports_count,helpful_reports_count,current_streak,longest_streak,last_contribution_date,false,true
    from public.guest_profiles where id=p_guest_profile_id
  ) select jsonb_build_object(
    'ownerType',case when is_guest then 'guest' else 'authenticated' end,'displayName',coalesce(display_name,'Community Member'),'avatarUrl',avatar_url,
    'xp',xp,'level',level,'levelProgress',public.gamification_level_progress(xp),'reputationScore',reputation_score,'reportsCount',reports_count,
    'verifiedReportsCount',verified_reports_count,'helpfulReportsCount',helpful_reports_count,'currentStreak',current_streak,'longestStreak',longest_streak,
    'lastContributionDate',last_contribution_date,'showOnLeaderboard',show_on_leaderboard
  ) from p;
$$;

create or replace function public.get_user_gamification_summary()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
  return public.gamification_summary_json(auth.uid(),null);
end;
$$;

create or replace function public.get_guest_gamification_summary(p_anonymous_installation_id uuid,p_anonymous_claim_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare guest_id uuid:=public.verify_guest_profile(p_anonymous_installation_id,p_anonymous_claim_token);
begin
  if guest_id is null then raise exception 'GUEST_IDENTITY_INVALID' using errcode='P0001'; end if;
  return public.gamification_summary_json(null,guest_id);
end;
$$;

create or replace function public.get_profile_badges(p_anonymous_installation_id uuid default null,p_anonymous_claim_token text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid:=auth.uid(); gid uuid;
begin
  if uid is null then gid:=public.verify_guest_profile(p_anonymous_installation_id,p_anonymous_claim_token); end if;
  if uid is null and gid is null then return '[]'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('code',b.code,'name',b.name,'description',b.description,'iconKey',b.icon_key,'category',b.category,
    'requirement',b.requirement_value,'progress',least(b.requirement_value,public.profile_metric(b.requirement_type,uid,gid)),
    'state',case when pb.id is not null then 'unlocked' when public.profile_metric(b.requirement_type,uid,gid)>0 then 'in_progress' else 'locked' end,
    'earnedAt',pb.earned_at,'xpReward',b.xp_reward) order by b.requirement_value), '[]')
    from public.badges b left join public.profile_badges pb on pb.badge_id=b.id and (pb.user_id=uid or pb.guest_profile_id=gid) where b.is_active);
end;
$$;

create or replace function public.get_profile_achievements(p_anonymous_installation_id uuid default null,p_anonymous_claim_token text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid:=auth.uid(); gid uuid;
begin
  if uid is null then gid:=public.verify_guest_profile(p_anonymous_installation_id,p_anonymous_claim_token); end if;
  if uid is null and gid is null then return '[]'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('code',a.code,'title',a.title,'description',a.description,'currentProgress',least(a.target,public.profile_metric(a.requirement_type,uid,gid)),
    'target',a.target,'percentage',least(100,round(public.profile_metric(a.requirement_type,uid,gid)*100.0/a.target)),'isCompleted',coalesce(pa.is_completed,false),
    'completedAt',pa.completed_at,'xpReward',a.xp_reward) order by a.target),'[]') from public.achievements a left join public.profile_achievements pa
    on pa.achievement_id=a.id and (pa.user_id=uid or pa.guest_profile_id=gid) where a.is_active);
end;
$$;

create or replace function public.get_leaderboard(p_period text default 'weekly',p_limit integer default 25,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare since_time timestamptz;
begin
  if p_period not in ('weekly','monthly','all_time') then raise exception 'INVALID_LEADERBOARD_PERIOD' using errcode='P0001'; end if;
  since_time:=case p_period when 'weekly' then date_trunc('week',now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo'
    when 'monthly' then date_trunc('month',now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo' else '-infinity'::timestamptz end;
  return (with period_xp as (
    select user_id,sum(amount)::integer xp,min(created_at) reached_at from public.xp_transactions where user_id is not null and created_at>=since_time group by user_id
  ), badge_counts as (select user_id,count(*)::integer count from public.profile_badges where user_id is not null group by user_id), scores as (
    select p.user_id,coalesce(p.display_name,'Community Member') display_name,p.avatar_url,p.level,p.reputation_score,p.verified_reports_count,
      x.xp period_xp,coalesce(b.count,0) badges_count,(x.xp+floor(p.reputation_score/10))::integer score,x.reached_at
    from public.user_profiles p join period_xp x on x.user_id=p.user_id left join badge_counts b on b.user_id=p.user_id where p.show_on_leaderboard and x.xp>0
  ), ranked as (select *,row_number() over(order by score desc,reputation_score desc,verified_reports_count desc,reached_at,user_id) rank from scores)
  select jsonb_build_object('period',p_period,'entries',coalesce(jsonb_agg(jsonb_build_object('rank',rank,'displayName',display_name,'avatarUrl',avatar_url,'level',level,
    'periodXp',period_xp,'verifiedReportsCount',verified_reports_count,'reputationScore',reputation_score,'badgesCount',badges_count) order by rank),'[]'),'hasMore',count(*)=least(50,greatest(1,p_limit)))
  from (select * from ranked order by rank limit least(50,greatest(1,p_limit)) offset greatest(0,p_offset)) page);
end;
$$;

create or replace function public.claim_guest_progress(p_anonymous_installation_id uuid,p_anonymous_claim_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid:=auth.uid(); gp public.guest_profiles; before_xp integer; guest_xp integer; badge_count integer; report_count integer;
begin
  if uid is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
  select * into gp from public.guest_profiles where anonymous_installation_id=p_anonymous_installation_id for update;
  if gp.id is null or gp.claim_token_hash<>extensions.digest(p_anonymous_claim_token,'sha256') then raise exception 'GUEST_IDENTITY_INVALID' using errcode='P0001'; end if;
  if gp.is_claimed then
    if gp.claimed_by_user_id<>uid then raise exception 'GUEST_ALREADY_CLAIMED' using errcode='P0001'; end if;
    return jsonb_build_object('summary',public.gamification_summary_json(uid,null),'transferredXp',0,'badgesPreserved',0,'contributionsLinked',0,'alreadyClaimed',true);
  end if;
  insert into public.user_profiles(user_id) values(uid) on conflict do nothing;
  select xp into before_xp from public.user_profiles where user_id=uid for update;
  select xp into guest_xp from public.guest_profiles where id=gp.id;
  select count(*) into report_count from public.financial_service_reports where anonymous_installation_id=p_anonymous_installation_id and reporter_type='guest';
  select count(*) into badge_count from public.profile_badges where guest_profile_id=gp.id;
  update public.financial_service_reports set user_id=uid,original_guest_profile_id=gp.id,anonymous_installation_id=null,reporter_type='authenticated'
    where anonymous_installation_id=p_anonymous_installation_id and reporter_type='guest';
  update public.xp_transactions set user_id=uid,guest_profile_id=null,claimed_at=now() where guest_profile_id=gp.id;
  insert into public.profile_badges(badge_id,user_id,earned_at,progress,reward_claimed)
    select badge_id,uid,earned_at,progress,reward_claimed from public.profile_badges where guest_profile_id=gp.id
    on conflict do nothing;
  delete from public.profile_badges where guest_profile_id=gp.id;
  delete from public.profile_achievements where guest_profile_id=gp.id;
  update public.gamification_abuse_events set user_id=uid,guest_profile_id=null where guest_profile_id=gp.id;
  update public.guest_profiles set is_claimed=true,claimed_by_user_id=uid,claimed_at=now() where id=gp.id;
  perform public.recalculate_gamification_profile(uid,null);
  perform public.evaluate_profile_rewards(uid,null);
  return jsonb_build_object('summary',public.gamification_summary_json(uid,null),'transferredXp',guest_xp,'badgesPreserved',badge_count,'contributionsLinked',report_count,'alreadyClaimed',false);
end;
$$;

alter table public.gamification_config enable row level security;
alter table public.guest_profiles enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.badges enable row level security;
alter table public.profile_badges enable row level security;
alter table public.achievements enable row level security;
alter table public.profile_achievements enable row level security;
alter table public.report_confirmations enable row level security;
alter table public.gamification_abuse_events enable row level security;

create policy "users read own gamification profile" on public.user_profiles for select to authenticated using(auth.uid()=user_id);
create policy "users read own xp transactions" on public.xp_transactions for select to authenticated using(auth.uid()=user_id);
create policy "users read own badges" on public.profile_badges for select to authenticated using(auth.uid()=user_id);
create policy "users read own achievements" on public.profile_achievements for select to authenticated using(auth.uid()=user_id);
create policy "active badges are readable" on public.badges for select to anon,authenticated using(is_active);
create policy "active achievements are readable" on public.achievements for select to anon,authenticated using(is_active);

revoke all on table public.gamification_config,public.guest_profiles,public.xp_transactions,public.profile_badges,public.profile_achievements,public.report_confirmations,public.gamification_abuse_events from anon,authenticated;
grant select on table public.badges,public.achievements to anon,authenticated;
grant select on table public.xp_transactions,public.profile_badges,public.profile_achievements to authenticated;
revoke all on function public.verify_guest_profile(uuid,text),public.recalculate_gamification_profile(uuid,uuid),public.evaluate_profile_rewards(uuid,uuid),public.gamification_summary_json(uuid,uuid) from public;
grant execute on function public.get_user_gamification_summary() to authenticated;
grant execute on function public.get_guest_gamification_summary(uuid,text),public.get_profile_badges(uuid,text),public.get_profile_achievements(uuid,text),public.get_leaderboard(text,integer,integer) to anon,authenticated;
grant execute on function public.claim_guest_progress(uuid,text) to authenticated;

create or replace function public.submit_financial_service_report_with_rewards(
  p_financial_service_id uuid,
  p_reported_status text,
  p_failure_reason text,
  p_latitude double precision,
  p_longitude double precision,
  p_request_id uuid,
  p_note text default null,
  p_anonymous_installation_id uuid default null,
  p_anonymous_claim_token text default null
)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare
  uid uuid:=auth.uid(); gid uuid; gp public.guest_profiles; updated_service public.financial_services; report_row public.financial_service_reports;
  rules jsonb:=(select value from public.gamification_config where key='xp_rules');
  before_xp integer:=0; after_xp integer:=0; reward_xp integer:=0; reward_count integer:=0; first_today boolean; fresh_location boolean;
  repeat_location boolean; rewards jsonb; previous_report record; owner_uid uuid; owner_gid uuid;
  last_report public.financial_service_reports; travel_km numeric; travel_hours numeric; rejection_code text;
begin
  if uid is null then
    if p_anonymous_installation_id is null or coalesce(length(p_anonymous_claim_token),0)<32 then
      return jsonb_build_object('accepted',false,'errorCode','REPORT_IDENTITY_REQUIRED');
    end if;
    select * into gp from public.guest_profiles where anonymous_installation_id=p_anonymous_installation_id for update;
    if gp.id is null then
      insert into public.guest_profiles(anonymous_installation_id,claim_token_hash)
      values(p_anonymous_installation_id,extensions.digest(p_anonymous_claim_token,'sha256')) returning * into gp;
    elsif gp.claim_token_hash<>extensions.digest(p_anonymous_claim_token,'sha256') then
      return jsonb_build_object('accepted',false,'errorCode','REPORT_IDENTITY_INVALID');
    end if;
    gid:=gp.id;
  else
    insert into public.user_profiles(user_id) values(uid) on conflict do nothing;
  end if;

  select r.* into last_report from public.financial_service_reports r where
    (uid is not null and r.user_id=uid) or (gid is not null and r.anonymous_installation_id=p_anonymous_installation_id)
    order by r.created_at desc limit 1;
  if last_report.id is not null then
    travel_km:=extensions.st_distance(
      extensions.st_setsrid(extensions.st_makepoint(last_report.longitude,last_report.latitude),4326)::extensions.geography,
      extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography
    )/1000.0;
    travel_hours:=greatest(extract(epoch from (now()-last_report.created_at))/3600.0,1.0/3600.0);
    if travel_km>=10 and travel_km/travel_hours>250 then
      insert into public.gamification_abuse_events(user_id,guest_profile_id,event_type,points,source_id)
        values(uid,gid,'implausible_travel',5,p_request_id);
      perform public.recalculate_gamification_profile(uid,gid);
      return jsonb_build_object('accepted',false,'errorCode','REPORT_IMPLAUSIBLE_TRAVEL');
    end if;
  end if;

  if (uid is null and gp.is_claimed) then
    updated_service:=public.submit_financial_service_report(p_financial_service_id,p_reported_status,p_failure_reason,p_latitude,p_longitude,p_request_id,p_note,p_anonymous_installation_id);
    return jsonb_build_object('accepted',true,'location',to_jsonb(updated_service),'rewardStatus','sign_in_required','xpAwarded',0,'rewards',jsonb_build_object('badges','[]'::jsonb,'achievements','[]'::jsonb));
  end if;

  select exists(select 1 from public.financial_service_reports r where r.financial_service_id=p_financial_service_id and r.expires_at>now()) into fresh_location;
  fresh_location:=not fresh_location;
  select exists(select 1 from public.financial_service_reports r where r.financial_service_id=p_financial_service_id and r.created_at>now()-interval '6 hours'
    and ((uid is not null and r.user_id=uid) or (gid is not null and r.anonymous_installation_id=p_anonymous_installation_id))) into repeat_location;

  begin
    updated_service:=public.submit_financial_service_report(p_financial_service_id,p_reported_status,p_failure_reason,p_latitude,p_longitude,p_request_id,p_note,p_anonymous_installation_id);
  exception when others then
    rejection_code:=coalesce(substring(sqlerrm from 'REPORT_[A-Z_]+'),'REPORT_ERROR');
    insert into public.gamification_abuse_events(user_id,guest_profile_id,event_type,points,source_id)
      values(uid,gid,lower(rejection_code),case when rejection_code in ('REPORT_INVALID_STATUS','REPORT_IDENTITY_INVALID') then 5 else 0 end,p_request_id);
    return jsonb_build_object('accepted',false,'errorCode',rejection_code);
  end;

  select * into report_row from public.financial_service_reports r where r.request_id=p_request_id and
    ((uid is not null and r.user_id=uid) or (gid is not null and r.anonymous_installation_id=p_anonymous_installation_id));
  if report_row.id is null then return jsonb_build_object('accepted',false,'errorCode','REPORT_NOT_FOUND'); end if;
  update public.financial_service_reports set is_first_recent_report=fresh_location where id=report_row.id;

  select count(*)::integer into reward_count from public.financial_service_reports r where
    ((uid is not null and r.user_id=uid) or (gid is not null and r.anonymous_installation_id=p_anonymous_installation_id))
    and (r.created_at at time zone 'Africa/Cairo')::date=(now() at time zone 'Africa/Cairo')::date;
  if uid is not null then select xp into before_xp from public.user_profiles where user_id=uid; else select xp into before_xp from public.guest_profiles where id=gid; end if;

  if reward_count<=coalesce((rules->>'daily_reward_limit')::integer,20) then
    insert into public.xp_transactions(user_id,guest_profile_id,amount,reason,source_type,source_id)
      values(uid,gid,case when repeat_location then coalesce((rules->>'repeat_location')::integer,1) else coalesce((rules->>'accepted_report')::integer,5) end,'accepted_report','report',report_row.id)
      on conflict do nothing;
    select not exists(select 1 from public.xp_transactions x where (x.user_id=uid or x.guest_profile_id=gid) and x.reason='first_daily_report'
      and (x.created_at at time zone 'Africa/Cairo')::date=(now() at time zone 'Africa/Cairo')::date and x.source_id<>report_row.id) into first_today;
    if first_today then insert into public.xp_transactions(user_id,guest_profile_id,amount,reason,source_type,source_id)
      values(uid,gid,coalesce((rules->>'first_daily')::integer,2),'first_daily_report','report',report_row.id) on conflict do nothing; end if;
    if fresh_location and not repeat_location then insert into public.xp_transactions(user_id,guest_profile_id,amount,reason,source_type,source_id)
      values(uid,gid,coalesce((rules->>'fresh_location')::integer,3),'fresh_location','report',report_row.id) on conflict do nothing; end if;
  end if;

  for previous_report in select r.* from public.financial_service_reports r where r.financial_service_id=p_financial_service_id
    and r.id<>report_row.id and r.reported_status=p_reported_status and r.expires_at>report_row.created_at
    and not ((uid is not null and r.user_id=uid) or (gid is not null and r.anonymous_installation_id=p_anonymous_installation_id))
  loop
    insert into public.report_confirmations(report_id,confirming_report_id) values(previous_report.id,report_row.id) on conflict do nothing;
    update public.financial_service_reports set community_confirmed_at=coalesce(community_confirmed_at,now()) where id=previous_report.id;
    owner_uid:=previous_report.user_id;
    owner_gid:=previous_report.original_guest_profile_id;
    if owner_uid is null and owner_gid is null then select id into owner_gid from public.guest_profiles where anonymous_installation_id=previous_report.anonymous_installation_id; end if;
    if owner_uid is not null or owner_gid is not null then
      insert into public.xp_transactions(user_id,guest_profile_id,amount,reason,source_type,source_id)
        values(owner_uid,owner_gid,coalesce((rules->>'confirmation')::integer,3),'report_confirmation','report_confirmation',previous_report.id) on conflict do nothing;
      if (select count(*) from public.report_confirmations where report_id=previous_report.id)>=2 then
        insert into public.xp_transactions(user_id,guest_profile_id,amount,reason,source_type,source_id)
          values(owner_uid,owner_gid,coalesce((rules->>'high_quality')::integer,2),'high_quality_report','report_confirmation',previous_report.id) on conflict do nothing;
      end if;
      perform public.recalculate_gamification_profile(owner_uid,owner_gid);
      perform public.evaluate_profile_rewards(owner_uid,owner_gid);
    end if;
  end loop;

  perform public.recalculate_gamification_profile(uid,gid);
  if coalesce((public.gamification_summary_json(uid,gid)->>'currentStreak')::integer,0)>=7 then
    insert into public.xp_transactions(user_id,guest_profile_id,amount,reason,source_type,source_id)
      values(uid,gid,coalesce((rules->>'seven_day_streak')::integer,10),'seven_day_streak','streak',coalesce(uid,gid)) on conflict do nothing;
    perform public.recalculate_gamification_profile(uid,gid);
  end if;
  rewards:=public.evaluate_profile_rewards(uid,gid);
  if uid is not null then select xp into after_xp from public.user_profiles where user_id=uid; else select xp into after_xp from public.guest_profiles where id=gid; end if;
  reward_xp:=greatest(0,after_xp-before_xp);
  return jsonb_build_object('accepted',true,'location',to_jsonb(updated_service),'rewardStatus','awarded','xpAwarded',reward_xp,
    'levelProgress',public.gamification_level_progress(after_xp),'rewards',rewards,'summary',public.gamification_summary_json(uid,gid));
end;
$$;

revoke all on function public.submit_financial_service_report_with_rewards(uuid,text,text,double precision,double precision,uuid,text,uuid,text) from public;
grant execute on function public.submit_financial_service_report_with_rewards(uuid,text,text,double precision,double precision,uuid,text,uuid,text) to anon,authenticated;
grant update(display_name,avatar_url,show_on_leaderboard) on table public.user_profiles to authenticated;

create or replace function public.get_contribution_history(p_limit integer default 25,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
  return (select jsonb_build_object('entries',coalesce(jsonb_agg(jsonb_build_object(
    'id',r.id,'financialServiceId',r.financial_service_id,'locationName',f.name,'status',r.reported_status,
    'isVerified',r.is_verified,'isConfirmed',r.community_confirmed_at is not null,'createdAt',r.created_at
  ) order by r.created_at desc),'[]'),'hasMore',count(*)=least(50,greatest(1,p_limit)))
  from (select * from public.financial_service_reports where user_id=auth.uid() order by created_at desc limit least(50,greatest(1,p_limit)) offset greatest(0,p_offset)) r
  join public.financial_services f on f.id=r.financial_service_id);
end;
$$;

create or replace function public.get_user_leaderboard_position(p_period text default 'weekly')
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare uid uuid:=auth.uid(); since_time timestamptz;
begin
  if uid is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
  if p_period not in ('weekly','monthly','all_time') then raise exception 'INVALID_LEADERBOARD_PERIOD' using errcode='P0001'; end if;
  since_time:=case p_period when 'weekly' then date_trunc('week',now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo'
    when 'monthly' then date_trunc('month',now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo' else '-infinity'::timestamptz end;
  return (with scores as (select p.user_id,p.reputation_score,p.verified_reports_count,sum(x.amount)::integer xp,min(x.created_at) reached_at,
      (sum(x.amount)+floor(p.reputation_score/10))::integer score from public.user_profiles p join public.xp_transactions x on x.user_id=p.user_id
      where x.created_at>=since_time group by p.user_id), ranked as (select *,row_number() over(order by score desc,reputation_score desc,verified_reports_count desc,reached_at,user_id) rank from scores)
    select jsonb_build_object('period',p_period,'rank',rank,'periodXp',xp,'isVisible',(select show_on_leaderboard from public.user_profiles where user_id=uid)) from ranked where user_id=uid);
end;
$$;

revoke all on function public.get_contribution_history(integer,integer),public.get_user_leaderboard_position(text) from public;
grant execute on function public.get_contribution_history(integer,integer),public.get_user_leaderboard_position(text) to authenticated;

create or replace function public.finalize_due_weekly_leaderboard()
returns void language plpgsql security definer set search_path=public as $$
declare ranked_user record; badge public.badges; ownership_id uuid;
begin
  if extract(isodow from now() at time zone 'Africa/Cairo')<>1 or extract(hour from now() at time zone 'Africa/Cairo')<>0 then return; end if;
  select * into badge from public.badges where code='top_contributor' and is_active;
  for ranked_user in
    with scores as (
      select p.user_id,sum(x.amount)::integer score,p.reputation_score,p.verified_reports_count,min(x.created_at) reached_at
      from public.user_profiles p join public.xp_transactions x on x.user_id=p.user_id
      where p.show_on_leaderboard and x.created_at>=date_trunc('week',now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo'-interval '7 days'
        and x.created_at<date_trunc('week',now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo'
      group by p.user_id
    ) select * from scores order by score desc,reputation_score desc,verified_reports_count desc,reached_at,user_id limit 10
  loop
    insert into public.profile_badges(badge_id,user_id,progress) values(badge.id,ranked_user.user_id,1) on conflict do nothing returning id into ownership_id;
    if ownership_id is not null then
      insert into public.xp_transactions(user_id,amount,reason,source_type,source_id)
        values(ranked_user.user_id,badge.xp_reward,'badge:'||badge.code,'badge',ownership_id) on conflict do nothing;
      perform public.recalculate_gamification_profile(ranked_user.user_id,null);
    end if;
    ownership_id:=null;
  end loop;
end;
$$;

revoke all on function public.finalize_due_weekly_leaderboard() from public;
grant execute on function public.finalize_due_weekly_leaderboard() to service_role;
