-- Migration: ensure points engagement triggers and supporting tables exist

begin;

-- Guarantee activity column and uniqueness for deduplication
alter table public.points_transactions
  add column if not exists activity text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.points_transactions'::regclass
      and conname = 'points_transactions_activity_unique'
  ) then
    alter table public.points_transactions
      add constraint points_transactions_activity_unique
      unique (user_id, activity, reference_id);
  end if;
end;
$$;

-- Core helper to mutate balances and capture transactions
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

-- Helper to test for an existing activity entry
create or replace function public.points_transaction_exists(
  p_user_id uuid,
  p_activity text,
  p_reference uuid
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.points_transactions
    where user_id = p_user_id
      and activity = p_activity
      and reference_id = p_reference
  );
$$;

-- Auxiliary tables for share tracking
create table if not exists public.post_shares (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  share_channel text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists post_shares_post_id_idx on public.post_shares(post_id);
create index if not exists post_shares_user_id_idx on public.post_shares(user_id);

alter table public.post_shares enable row level security;

do $ps$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'post_shares'
      and policyname = 'Post shares are viewable by everyone'
  ) then
    create policy "Post shares are viewable by everyone"
      on public.post_shares for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'post_shares'
      and policyname = 'Users can insert their own post shares'
  ) then
    create policy "Users can insert their own post shares"
      on public.post_shares for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'post_shares'
      and policyname = 'Users can delete their own post shares'
  ) then
    create policy "Users can delete their own post shares"
      on public.post_shares for delete
      using (auth.uid() = user_id);
  end if;
end;
$ps$;

grant select on public.post_shares to anon, authenticated;
grant insert, delete on public.post_shares to authenticated;

create table if not exists public.app_share_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  share_target text,
  share_channel text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists app_share_events_user_id_idx on public.app_share_events(user_id);
create index if not exists app_share_events_target_idx on public.app_share_events(share_target);

alter table public.app_share_events enable row level security;

do $ase$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'app_share_events'
      and policyname = 'App share events are viewable by creators'
  ) then
    create policy "App share events are viewable by creators"
      on public.app_share_events for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'app_share_events'
      and policyname = 'Users can insert their own app share events'
  ) then
    create policy "Users can insert their own app share events"
      on public.app_share_events for insert
      with check (auth.uid() = user_id);
  end if;
end;
$ase$;

grant select, insert on public.app_share_events to authenticated;

-- Reward and reversal procedures
create or replace function public.reward_points_for_post_creation()
returns trigger
language plpgsql
as $$
begin
  perform public.log_points_transaction(
    new.user_id,
    10.0,
    'Post published reward',
    new.id,
    'post_create',
    null
  );

  return new;
end;
$$;

create or replace function public.revoke_points_for_post_deletion()
returns trigger
language plpgsql
as $$
begin
  if public.points_transaction_exists(old.user_id, 'post_create', old.id) then
    perform public.log_points_transaction(
      old.user_id,
      -10.0,
      'Post removed adjustment',
      old.id,
      'post_delete',
      'spent'
    );
  end if;

  return old;
end;
$$;

create or replace function public.reward_points_for_post_like()
returns trigger
language plpgsql
as $$
begin
  perform public.log_points_transaction(
    new.user_id,
    0.5,
    'Post like engagement reward',
    new.id,
    'post_like',
    null
  );

  return new;
end;
$$;

create or replace function public.revoke_points_for_post_unlike()
returns trigger
language plpgsql
as $$
begin
  if public.points_transaction_exists(old.user_id, 'post_like', old.id) then
    perform public.log_points_transaction(
      old.user_id,
      -0.5,
      'Post like removed adjustment',
      old.id,
      'post_like_reversal',
      'spent'
    );
  end if;

  return old;
end;
$$;

create or replace function public.reward_points_for_post_comment()
returns trigger
language plpgsql
as $$
begin
  perform public.log_points_transaction(
    new.user_id,
    0.5,
    'Post comment engagement reward',
    new.id,
    'post_comment',
    null
  );

  return new;
end;
$$;

create or replace function public.revoke_points_for_post_comment()
returns trigger
language plpgsql
as $$
begin
  if public.points_transaction_exists(old.user_id, 'post_comment', old.id) then
    perform public.log_points_transaction(
      old.user_id,
      -0.5,
      'Post comment removed adjustment',
      old.id,
      'post_comment_reversal',
      'spent'
    );
  end if;

  return old;
end;
$$;

create or replace function public.increment_post_shares()
returns trigger
language plpgsql
as $$
begin
  update public.posts
  set shares_count = shares_count + 1
  where id = new.post_id;

  perform public.log_points_transaction(
    new.user_id,
    0.5,
    'Post share engagement reward',
    new.id,
    'post_share',
    null
  );

  return new;
end;
$$;

create or replace function public.decrement_post_shares()
returns trigger
language plpgsql
as $$
begin
  update public.posts
  set shares_count = greatest(0, shares_count - 1)
  where id = old.post_id;

  if public.points_transaction_exists(old.user_id, 'post_share', old.id) then
    perform public.log_points_transaction(
      old.user_id,
      -0.5,
      'Post share removed adjustment',
      old.id,
      'post_share_reversal',
      'spent'
    );
  end if;

  return old;
end;
$$;

create or replace function public.reward_points_for_app_share()
returns trigger
language plpgsql
as $$
begin
  perform public.log_points_transaction(
    new.user_id,
    10.0,
    'App share reward',
    new.id,
    'app_share',
    null
  );

  return new;
end;
$$;

-- Refresh triggers
drop trigger if exists reward_points_post_create on public.posts;
create trigger reward_points_post_create
  after insert on public.posts
  for each row
  execute function public.reward_points_for_post_creation();

drop trigger if exists revoke_points_post_delete on public.posts;
create trigger revoke_points_post_delete
  after delete on public.posts
  for each row
  execute function public.revoke_points_for_post_deletion();

drop trigger if exists reward_points_post_like on public.post_likes;
create trigger reward_points_post_like
  after insert on public.post_likes
  for each row
  execute function public.reward_points_for_post_like();

drop trigger if exists revoke_points_post_like on public.post_likes;
create trigger revoke_points_post_like
  after delete on public.post_likes
  for each row
  execute function public.revoke_points_for_post_unlike();

drop trigger if exists reward_points_post_comment on public.post_comments;
create trigger reward_points_post_comment
  after insert on public.post_comments
  for each row
  execute function public.reward_points_for_post_comment();

drop trigger if exists revoke_points_post_comment on public.post_comments;
create trigger revoke_points_post_comment
  after delete on public.post_comments
  for each row
  execute function public.revoke_points_for_post_comment();

drop trigger if exists increment_post_share_count on public.post_shares;
create trigger increment_post_share_count
  after insert on public.post_shares
  for each row
  execute function public.increment_post_shares();

drop trigger if exists decrement_post_share_count on public.post_shares;
create trigger decrement_post_share_count
  after delete on public.post_shares
  for each row
  execute function public.decrement_post_shares();

drop trigger if exists reward_points_app_share on public.app_share_events;
create trigger reward_points_app_share
  after insert on public.app_share_events
  for each row
  execute function public.reward_points_for_app_share();

commit;

