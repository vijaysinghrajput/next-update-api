# 🎯 Quick Setup Guide for Comments Feature

## ✅ What's Already Done

1. **Environment Variables** - Already configured in `.env.local`:
   - ✅ NEXT_PUBLIC_SUPABASE_URL
   - ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY  
   - ✅ SUPABASE_SERVICE_ROLE_KEY

2. **Frontend Code** - All implemented:
   - ✅ PostCard component with Instagram-style comments
   - ✅ Comments modal with scrollable list
   - ✅ Add comment functionality
   - ✅ Real-time updates
   - ✅ Beautiful UI with animations

3. **MCP Configuration** - Created:
   - ✅ `.vscode/mcp.json` with your project ref

## 🚀 What You Need to Do

### Apply Database Migration (2 minutes)

**Option 1: Supabase Dashboard (Recommended)**

1. Go to: https://supabase.com/dashboard/project/iuiyvteuleqknwkdeqde/editor

2. Click **SQL Editor** → **New query**

3. Copy and paste this SQL:

```sql
-- Create post_comments table
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON public.post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON public.post_comments(created_at DESC);

-- Enable RLS
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.post_comments;
CREATE POLICY "Comments are viewable by everyone"
  ON public.post_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.post_comments;
CREATE POLICY "Authenticated users can create comments"
  ON public.post_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own comments" ON public.post_comments;
CREATE POLICY "Users can update their own comments"
  ON public.post_comments FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.post_comments;
CREATE POLICY "Users can delete their own comments"
  ON public.post_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Update trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.post_comments;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

4. Click **Run** or press `Ctrl+Enter`

5. You should see: **Success. No rows returned**

**Option 2: Command Line**

```bash
# Run from project root
node migrate-comments.js
```

## ✅ Verification

After running the SQL, verify the table was created:

```sql
SELECT * FROM information_schema.tables 
WHERE table_name = 'post_comments';
```

You should see one row with `table_name = 'post_comments'`

## 🎉 Test the Feature

1. **Start dev server** (if not running):
   ```bash
   npm run dev
   ```

2. **Open your app**: http://localhost:3003

3. **Test comments**:
   - Click on any post's comment icon (💬)
   - Modal should open
   - Type a comment and press Enter
   - Comment should appear immediately!

## 📊 What Was Created

### Database Table: `post_comments`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| post_id | UUID | Foreign key to posts |
| user_id | UUID | Foreign key to profiles |
| content | TEXT | Comment text (max 500 chars) |
| created_at | TIMESTAMPTZ | Auto timestamp |
| updated_at | TIMESTAMPTZ | Auto-updated |

### Security (RLS Policies)
- ✅ **Read**: Everyone can view comments
- ✅ **Create**: Only authenticated users
- ✅ **Update**: Only comment author
- ✅ **Delete**: Only comment author

### Performance (Indexes)
- ✅ Index on `post_id` (fast lookup by post)
- ✅ Index on `user_id` (fast lookup by user)
- ✅ Index on `created_at` (fast sorting)

## 🐛 Troubleshooting

**If comments don't load:**
1. Check browser console for errors
2. Verify table exists in Supabase Dashboard
3. Check RLS policies are enabled
4. Ensure user is authenticated

**If can't add comments:**
1. Verify you're logged in
2. Check `user_id` matches authenticated user
3. Check RLS policy for INSERT

**Need help?**
Check the full migration file: `supabase/migrations/001_create_post_comments_table.sql`

---

**Your Supabase Project**: 
- **URL**: https://iuiyvteuleqknwkdeqde.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/iuiyvteuleqknwkdeqde

**Status**: 🟢 Ready to apply migration!
