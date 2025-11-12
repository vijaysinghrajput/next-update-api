-- =====================================================
-- COPY THIS ENTIRE SQL AND RUN IN SUPABASE SQL EDITOR
-- =====================================================
-- Go to: https://supabase.com/dashboard/project/gbmvzpslsakkuwdvmiit/sql/new
-- Paste this SQL and click "Run"
-- =====================================================

-- Create post_comments table
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON post_comments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all comments" ON post_comments;
DROP POLICY IF EXISTS "Users can add comments" ON post_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON post_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON post_comments;

-- Create RLS policies
CREATE POLICY "Users can view all comments" 
ON post_comments FOR SELECT 
USING (true);

CREATE POLICY "Users can add comments" 
ON post_comments FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" 
ON post_comments FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" 
ON post_comments FOR DELETE 
USING (auth.uid() = user_id);

-- =====================================================
-- DONE! Comments table is ready ✅
-- =====================================================
