-- Auto-increase post likes system
-- This system automatically adds 100 likes to posts daily without cron jobs
-- It works by checking the last update time when posts are queried

-- Create a table to track last auto-like update for each post
CREATE TABLE IF NOT EXISTS public.post_auto_likes (
  post_id UUID PRIMARY KEY REFERENCES public.posts(id) ON DELETE CASCADE,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_auto_likes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.post_auto_likes ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read auto likes
CREATE POLICY "Auto likes are viewable by everyone"
  ON public.post_auto_likes
  FOR SELECT
  USING (true);

-- Only system can update auto likes
CREATE POLICY "Only system can update auto likes"
  ON public.post_auto_likes
  FOR ALL
  USING (false);

-- Function to calculate and apply auto likes for a post
CREATE OR REPLACE FUNCTION public.calculate_auto_likes(p_post_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_post_created_at TIMESTAMPTZ;
  v_last_updated_at TIMESTAMPTZ;
  v_current_auto_likes INTEGER;
  v_days_since_last_update INTEGER;
  v_new_auto_likes INTEGER;
  v_total_auto_likes INTEGER;
BEGIN
  -- Get post creation date
  SELECT created_at INTO v_post_created_at
  FROM public.posts
  WHERE id = p_post_id;

  IF v_post_created_at IS NULL THEN
    RETURN 0;
  END IF;

  -- Get or create auto likes record
  SELECT last_updated_at, total_auto_likes
  INTO v_last_updated_at, v_current_auto_likes
  FROM public.post_auto_likes
  WHERE post_id = p_post_id;

  IF v_last_updated_at IS NULL THEN
    -- First time, initialize with post creation date
    v_last_updated_at := v_post_created_at;
    v_current_auto_likes := 0;
    
    INSERT INTO public.post_auto_likes (post_id, last_updated_at, total_auto_likes)
    VALUES (p_post_id, v_post_created_at, 0)
    ON CONFLICT (post_id) DO NOTHING;
  END IF;

  -- Calculate days since last update
  v_days_since_last_update := FLOOR(EXTRACT(EPOCH FROM (NOW() - v_last_updated_at)) / 86400)::INTEGER;

  IF v_days_since_last_update > 0 THEN
    -- Calculate new auto likes (100 per day)
    v_new_auto_likes := v_days_since_last_update * 100;
    v_total_auto_likes := v_current_auto_likes + v_new_auto_likes;

    -- Update the auto likes record
    UPDATE public.post_auto_likes
    SET 
      last_updated_at = NOW(),
      total_auto_likes = v_total_auto_likes
    WHERE post_id = p_post_id;

    -- Update the post's likes_count
    UPDATE public.posts
    SET likes_count = likes_count + v_new_auto_likes
    WHERE id = p_post_id;

    RETURN v_total_auto_likes;
  END IF;

  RETURN v_current_auto_likes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-update likes for all posts (called periodically via SELECT)
CREATE OR REPLACE FUNCTION public.auto_update_all_post_likes()
RETURNS TABLE(post_id UUID, auto_likes_added INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    public.calculate_auto_likes(p.id)
  FROM public.posts p
  WHERE p.is_active = true
    AND p.created_at < NOW() - INTERVAL '1 day'; -- Only posts older than 1 day
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to auto-update likes when post is queried
CREATE OR REPLACE FUNCTION public.trigger_auto_update_post_likes()
RETURNS TRIGGER AS $$
BEGIN
  -- Silently calculate auto likes (don't block the query)
  PERFORM public.calculate_auto_likes(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires AFTER SELECT on posts (using a workaround)
-- Since PostgreSQL doesn't support AFTER SELECT triggers directly,
-- we'll use a different approach with a view

-- Create a function that can be called from the application
CREATE OR REPLACE FUNCTION public.get_posts_with_auto_likes(
  p_city_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_order_by TEXT DEFAULT 'created_at',
  p_order_desc BOOLEAN DEFAULT true
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  city_id UUID,
  title TEXT,
  caption TEXT,
  media_urls TEXT[],
  media_type VARCHAR,
  likes_count INTEGER,
  comments_count INTEGER,
  shares_count INTEGER,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_sql TEXT;
BEGIN
  -- First, update auto likes for all posts that need it
  PERFORM public.calculate_auto_likes(p.id)
  FROM public.posts p
  WHERE p.is_active = true
    AND (p_city_id IS NULL OR p.city_id = p_city_id)
    AND p.created_at < NOW() - INTERVAL '1 day'
    AND NOT EXISTS (
      SELECT 1 FROM public.post_auto_likes pal
      WHERE pal.post_id = p.id
        AND pal.last_updated_at > NOW() - INTERVAL '1 day'
    );

  -- Build dynamic query
  v_sql := 'SELECT 
    p.id, p.user_id, p.city_id, p.title, p.caption, 
    p.media_urls, p.media_type, p.likes_count, 
    p.comments_count, p.shares_count, p.is_active,
    p.created_at, p.updated_at
  FROM public.posts p
  WHERE p.is_active = true';

  IF p_city_id IS NOT NULL THEN
    v_sql := v_sql || ' AND p.city_id = $1';
  END IF;

  v_sql := v_sql || ' ORDER BY p.' || p_order_by;
  
  IF p_order_desc THEN
    v_sql := v_sql || ' DESC';
  ELSE
    v_sql := v_sql || ' ASC';
  END IF;

  v_sql := v_sql || ' LIMIT $2 OFFSET $3';

  -- Execute and return
  IF p_city_id IS NOT NULL THEN
    RETURN QUERY EXECUTE v_sql USING p_city_id, p_limit, p_offset;
  ELSE
    RETURN QUERY EXECUTE v_sql USING p_limit, p_offset;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_auto_likes(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.auto_update_all_post_likes() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_posts_with_auto_likes(UUID, UUID, INTEGER, INTEGER, TEXT, BOOLEAN) TO authenticated, anon;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_post_auto_likes_last_updated 
  ON public.post_auto_likes(last_updated_at);

CREATE INDEX IF NOT EXISTS idx_posts_created_at_active 
  ON public.posts(created_at) WHERE is_active = true;

-- Seed initial data for existing posts
INSERT INTO public.post_auto_likes (post_id, last_updated_at, total_auto_likes)
SELECT 
  id,
  created_at,
  0
FROM public.posts
WHERE is_active = true
ON CONFLICT (post_id) DO NOTHING;

COMMENT ON TABLE public.post_auto_likes IS 'Tracks automatic like increases for posts (100 likes per day)';
COMMENT ON FUNCTION public.calculate_auto_likes(UUID) IS 'Calculates and applies auto likes for a specific post based on days elapsed';
COMMENT ON FUNCTION public.auto_update_all_post_likes() IS 'Updates auto likes for all active posts';
COMMENT ON FUNCTION public.get_posts_with_auto_likes(UUID, UUID, INTEGER, INTEGER, TEXT, BOOLEAN) IS 'Fetches posts and automatically updates their likes';
