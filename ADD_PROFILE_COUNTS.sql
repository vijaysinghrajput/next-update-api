-- ✨ ADD MISSING COLUMNS TO PROFILES TABLE
-- Copy and paste this in Supabase SQL Editor

-- Add follower/following/posts count columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;

-- Add bio column for user description
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_followers ON profiles(followers_count DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_posts ON profiles(posts_count DESC);

-- ✅ Create trigger to auto-update followers_count
CREATE OR REPLACE FUNCTION update_followers_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment follower count
    UPDATE profiles 
    SET followers_count = followers_count + 1 
    WHERE id = NEW.following_id;
    
    -- Increment following count
    UPDATE profiles 
    SET following_count = following_count + 1 
    WHERE id = NEW.follower_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement follower count
    UPDATE profiles 
    SET followers_count = GREATEST(followers_count - 1, 0)
    WHERE id = OLD.following_id;
    
    -- Decrement following count
    UPDATE profiles 
    SET following_count = GREATEST(following_count - 1, 0)
    WHERE id = OLD.follower_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_update_followers_count ON follows;

-- Create trigger
CREATE TRIGGER trigger_update_followers_count
AFTER INSERT OR DELETE ON follows
FOR EACH ROW
EXECUTE FUNCTION update_followers_count();

-- ✅ Create trigger to auto-update posts_count
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
    
  ELSIF TG_OP = 'UPDATE' AND NEW.is_active != OLD.is_active THEN
    IF NEW.is_active = true THEN
      UPDATE profiles 
      SET posts_count = posts_count + 1 
      WHERE id = NEW.user_id;
    ELSE
      UPDATE profiles 
      SET posts_count = GREATEST(posts_count - 1, 0)
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_update_posts_count ON posts;

-- Create trigger
CREATE TRIGGER trigger_update_posts_count
AFTER INSERT OR DELETE OR UPDATE OF is_active ON posts
FOR EACH ROW
EXECUTE FUNCTION update_posts_count();

-- ✅ Initialize counts from existing data
-- Count followers
UPDATE profiles p
SET followers_count = (
  SELECT COUNT(*) 
  FROM follows f 
  WHERE f.following_id = p.id
);

-- Count following
UPDATE profiles p
SET following_count = (
  SELECT COUNT(*) 
  FROM follows f 
  WHERE f.follower_id = p.id
);

-- Count active posts
UPDATE profiles p
SET posts_count = (
  SELECT COUNT(*) 
  FROM posts po 
  WHERE po.user_id = p.id 
  AND po.is_active = true
);

-- ✅ Done! Counts will now update automatically
SELECT 'Migration completed successfully!' as status;
