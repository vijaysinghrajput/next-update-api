-- Migration: ensure points activity metadata is present for wallet categorisation

begin;

alter table public.profiles
  alter column points_balance type double precision using points_balance::double precision,
  alter column points_balance set default 0;

alter table public.points_transactions
  alter column amount type double precision using amount::double precision,
  alter column amount set default 0;

alter table public.points_transactions
  add column if not exists activity text;

do $$
begin
  alter table public.points_transactions
    add constraint points_transactions_activity_unique
    unique (user_id, activity, reference_id);
exception
  when duplicate_object then
    null;
end;
$$;

create or replace function public.log_points_transaction(
  p_user_id uuid,
  p_amount double precision,
  p_description text,
  p_reference uuid default null,
  p_activity text default null,
  p_forced_type text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text;
  v_transaction_id uuid;
begin
  if p_user_id is null or p_amount = 0 then
    return null;
  end if;

  v_type := coalesce(
    p_forced_type,
    case when p_amount >= 0 then 'earned' else 'spent' end
  );

  update public.profiles
  set
    points_balance = coalesce(points_balance, 0)::double precision + p_amount,
    updated_at = timezone('utc', now())
  where id = p_user_id;

  select id
  into v_transaction_id
  from public.points_transactions
  where user_id = p_user_id
    and activity is not distinct from p_activity
    and reference_id is not distinct from p_reference
  limit 1;

  if v_transaction_id is not null then
    update public.points_transactions
    set
      amount = p_amount,
      type = v_type,
      description = p_description,
      created_at = timezone('utc', now())
    where id = v_transaction_id;
  else
    insert into public.points_transactions (
      user_id,
      type,
      amount,
      description,
      reference_id,
      activity
    )
    values (
      p_user_id,
      v_type,
      p_amount,
      p_description,
      p_reference,
      p_activity
    )
    returning id into v_transaction_id;
  end if;

  return v_transaction_id;
end;
$$;

grant execute on function public.log_points_transaction(uuid, double precision, text, uuid, text, text) to authenticated;

commit;

