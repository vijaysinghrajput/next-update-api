-- Migration: atomic blue tick purchase helper

begin;

create or replace function public.purchase_blue_tick(
  p_user_id uuid,
  p_cost double precision default 2000
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_cost double precision := coalesce(p_cost, 0);
begin
  if p_user_id is null then
    raise exception
      'User id cannot be null'
      using errcode = '22004';
  end if;

  if v_cost <= 0 then
    raise exception
      'Blue tick cost must be positive'
      using errcode = '22023';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception
      'Profile not found'
      using errcode = 'P0002';
  end if;

  if coalesce(v_profile.has_blue_tick, false) then
    raise exception
      'Blue tick already purchased'
      using errcode = 'P0001';
  end if;

  if coalesce(v_profile.points_balance, 0)::double precision < v_cost then
    raise exception
      'Insufficient points to purchase blue tick'
      using errcode = 'P0001';
  end if;

  perform public.log_points_transaction(
    p_user_id,
    -v_cost,
    'Blue tick purchase',
    null,
    'blue_tick_purchase',
    'spent'
  );

  update public.profiles
  set
    has_blue_tick = true,
    updated_at = timezone('utc', now())
  where id = p_user_id
  returning * into v_profile;

  return v_profile;
end;
$$;

grant execute on function public.purchase_blue_tick(uuid, double precision) to authenticated;

commit;

