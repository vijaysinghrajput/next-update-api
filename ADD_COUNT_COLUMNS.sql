-- Add missing count columns to profiles table
-- Run this in Supabase SQL Editor

-- Add followers_count column (default 0)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;

-- Add following_count column (default 0)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- Add posts_count column (default 0)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;

-- Add bio column if not exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_followers_count ON profiles(followers_count DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_posts_count ON profiles(posts_count DESC);

-- Function to update followers count
CREATE OR REPLACE FUNCTION update_followers_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment following_count for follower
    UPDATE profiles 
    SET following_count = following_count + 1 
    WHERE id = NEW.follower_id;
    
    -- Increment followers_count for user being followed
    UPDATE profiles 
    SET followers_count = followers_count + 1 
    WHERE id = NEW.following_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement following_count for follower
    UPDATE profiles 
    SET following_count = GREATEST(following_count - 1, 0)
    WHERE id = OLD.follower_id;
    
    -- Decrement followers_count for user being unfollowed
    UPDATE profiles 
    SET followers_count = GREATEST(followers_count - 1, 0)
    WHERE id = OLD.following_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for follows table
DROP TRIGGER IF EXISTS trigger_update_followers_count ON follows;
CREATE TRIGGER trigger_update_followers_count
AFTER INSERT OR DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION update_followers_count();

-- Function to update posts count
CREATE OR REPLACE FUNCTION update_posts_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles 
    SET posts_count = posts_count + 1 
    WHERE id = NEW.user_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles 
    SET posts_count = GREATEST(posts_count - 1, 0)
    WHERE id = OLD.user_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for posts table
DROP TRIGGER IF EXISTS trigger_update_posts_count ON posts;
CREATE TRIGGER trigger_update_posts_count
AFTER INSERT OR DELETE ON posts
FOR EACH ROW EXECUTE FUNCTION update_posts_count();

-- Initialize counts from existing data
UPDATE profiles p
SET 
  followers_count = (SELECT COUNT(*) FROM follows WHERE following_id = p.id),
  following_count = (SELECT COUNT(*) FROM follows WHERE follower_id = p.id),
  posts_count = (SELECT COUNT(*) FROM posts WHERE user_id = p.id AND is_active = true);

-- Success message
SELECT 'Database schema updated successfully!' as message;
