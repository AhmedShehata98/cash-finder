create or replace function public.get_financial_service_reliability(
  p_financial_service_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  with target as (
    select
      current_status,
      confidence_score,
      estimated_success_probability,
      last_confirmed_at
    from public.financial_services
    where id = p_financial_service_id
      and is_active = true
  ),
  latest_per_reporter as (
    select distinct on (r.reporter_type, coalesce(r.user_id, r.anonymous_installation_id))
      r.reported_status,
      r.created_at,
      r.is_verified
    from public.financial_service_reports r
    where r.financial_service_id = p_financial_service_id
      and r.expires_at > now()
    order by
      r.reporter_type,
      coalesce(r.user_id, r.anonymous_installation_id),
      r.created_at desc,
      r.id desc
  ),
  totals as (
    select
      count(*)::integer as active_count,
      count(*) filter (where is_verified)::integer as verified_count,
      max(created_at) as last_report_at
    from latest_per_reporter
  ),
  votes as (
    select
      reported_status,
      count(*)::integer as vote_count,
      max(created_at) as newest
    from latest_per_reporter
    group by reported_status
  ),
  dominant as (
    select reported_status
    from votes
    order by vote_count desc, newest desc, reported_status
    limit 1
  ),
  distribution as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'status', v.reported_status,
          'count', v.vote_count,
          'percentage', round(v.vote_count * 100.0 / nullif(t.active_count, 0))::integer
        )
        order by v.vote_count desc, v.reported_status
      ),
      '[]'::jsonb
    ) as value
    from votes v
    cross join totals t
  ),
  recent as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'status', activity.reported_status,
          'created_at', activity.created_at,
          'is_verified', activity.is_verified
        )
        order by activity.created_at desc
      ),
      '[]'::jsonb
    ) as value
    from (
      select reported_status, created_at, is_verified
      from latest_per_reporter
      order by created_at desc
      limit 3
    ) activity
  )
  select jsonb_build_object(
    'current_status', coalesce(target.current_status, 'unknown'),
    'confidence_score', target.confidence_score,
    'estimated_success_probability', target.estimated_success_probability,
    'last_confirmed_at', target.last_confirmed_at,
    'active_reports_count', totals.active_count,
    'verified_reports_count', totals.verified_count,
    'most_common_recent_status', dominant.reported_status,
    'last_report_at', totals.last_report_at,
    'report_freshness', case
      when totals.last_report_at is null then 'none'
      when totals.last_report_at > now() - interval '1 hour' then 'fresh'
      when totals.last_report_at > now() - interval '6 hours' then 'aging'
      else 'stale'
    end,
    'report_vote_distribution', distribution.value,
    'recent_report_activity', recent.value
  )
  from target
  cross join totals
  cross join distribution
  cross join recent
  left join dominant on true;
$$;

revoke all on function public.get_financial_service_reliability(uuid) from public;
grant execute on function public.get_financial_service_reliability(uuid) to anon, authenticated;
