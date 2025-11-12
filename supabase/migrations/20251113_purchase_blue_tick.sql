-- Migration: atomic blue tick purchase RPC

begin;

create or replace function public.purchase_blue_tick()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_transaction_id uuid;
  v_cost double precision := 2000;
begin
  if v_user_id is null then
    raise exception using
      message = 'Not authenticated',
      errcode = '42501';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception using
      message = 'Profile not found',
      errcode = 'P0002';
  end if;

  if coalesce(v_profile.is_verified, false) = false then
    raise exception using
      message = 'KYC verification required',
      errcode = 'NTKYC';
  end if;

  if coalesce(v_profile.has_blue_tick, false) then
    raise exception using
      message = 'Blue tick already granted',
      errcode = 'BTOWN';
  end if;

  if coalesce(v_profile.points_balance, 0) < v_cost then
    raise exception using
      message = 'Insufficient points for blue tick',
      errcode = 'PTLOW';
  end if;

  v_transaction_id := public.log_points_transaction(
    v_user_id,
    -v_cost,
    'Blue tick purchase',
    gen_random_uuid(),
    'blue_tick_purchase',
    'spent'
  );

  update public.profiles
  set
    has_blue_tick = true,
    updated_at = timezone('utc', now())
  where id = v_user_id;

  return v_transaction_id;
end;
$$;

grant execute on function public.purchase_blue_tick() to authenticated;

commit;

