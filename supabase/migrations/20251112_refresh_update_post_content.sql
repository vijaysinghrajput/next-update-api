-- Migration: extend update_post_content to support media updates without service role

create or replace function public.update_post_content(
  p_post_id uuid,
  p_title text,
  p_caption text,
  p_media_urls text[] default null,
  p_media_type text default null,
  p_update_media boolean default false
)
returns public.posts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post public.posts;
  v_target_media_type text;
begin
  if p_update_media then
    if p_media_type is not null and p_media_type = any (array['image', 'video']) then
      v_target_media_type := p_media_type;
    else
      select media_type into v_target_media_type
      from public.posts
      where id = p_post_id;
    end if;
  end if;

  update public.posts
  set
    title = p_title,
    caption = p_caption,
    media_urls = case
      when p_update_media then coalesce(p_media_urls, '{}'::text[])
      else media_urls
    end,
    media_type = case
      when p_update_media then coalesce(v_target_media_type, media_type)
      else media_type
    end,
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

grant execute on function public.update_post_content(uuid, text, text, text[], text, boolean) to authenticated;

comment on function public.update_post_content(uuid, text, text, text[], text, boolean) is
  'Updates the post owned by the current authenticated user, including optional media changes.';

