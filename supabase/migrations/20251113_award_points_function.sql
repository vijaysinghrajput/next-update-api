-- Migration: helper function to award engagement points on demand
-- Adds a convenience RPC wrapper over log_points_transaction for known activities.

begin;

create or replace function public.award_points_for_activity(
  p_user_id uuid,
  p_activity text,
  p_reference uuid default null,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount double precision;
  v_description text;
  v_tx_id uuid;
begin
  if p_user_id is null then
    raise exception using
      message = 'User id cannot be null',
      errcode = '22004';
  end if;

  v_amount := case lower(p_activity)
    when 'post_create' then 10.0
    when 'app_share' then 10.0
    when 'post_like' then 0.5
    when 'post_share' then 0.5
    when 'post_comment' then 0.5
    else null
  end;

  if v_amount is null then
    raise exception using
      message = format('Unsupported activity "%s" for award_points_for_activity', p_activity),
      errcode = '22023';
  end if;

  v_description := coalesce(
    p_description,
    case lower(p_activity)
      when 'post_create' then 'Post published reward'
      when 'app_share' then 'App share reward'
      when 'post_like' then 'Post like engagement reward'
      when 'post_share' then 'Post share engagement reward'
      when 'post_comment' then 'Post comment engagement reward'
    end
  );

  v_tx_id := public.log_points_transaction(
    p_user_id,
    v_amount,
    v_description,
    p_reference,
    lower(p_activity),
    null
  );

  return v_tx_id;
end;
$$;

grant execute on function public.award_points_for_activity(uuid, text, uuid, text) to authenticated;

commit;

