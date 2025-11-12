-- Migration: secure post editing and archival helpers
-- Ensures authenticated authors can edit or archive their own posts via RPC without exposing service keys.

create or replace function public.update_post_content(
  p_post_id uuid,
  p_title text,
  p_caption text
)
returns public.posts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post public.posts;
begin
  update public.posts
  set
    title = p_title,
    caption = p_caption,
    updated_at = timezone('utc', now())
  where id = p_post_id
    and user_id = auth.uid()
  returning * into v_post;

  if not found then
    raise exception
      'Not authorized to update post % or post does not exist',
      p_post_id
      using errcode = '42501';
  end if;

  return v_post;
end;
$$;

grant execute on function public.update_post_content(uuid, text, text) to authenticated;

comment on function public.update_post_content is
  'Updates the title/caption of a post owned by the current authenticated user and returns the full row.';


create or replace function public.archive_post(
  p_post_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_id uuid;
begin
  update public.posts
  set
    is_active = false,
    updated_at = timezone('utc', now())
  where id = p_post_id
    and user_id = auth.uid()
  returning id into v_post_id;

  if not found then
    raise exception
      'Not authorized to archive post % or post does not exist',
      p_post_id
      using errcode = '42501';
  end if;

  return v_post_id;
end;
$$;

grant execute on function public.archive_post(uuid) to authenticated;

comment on function public.archive_post is
  'Soft deletes a post owned by the current authenticated user by marking it inactive.';

