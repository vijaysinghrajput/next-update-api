// Test Supabase connection and post_comments table
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 Testing Supabase Configuration...\n')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    console.log('✅ Supabase URL:', supabaseUrl)
    console.log('✅ Anon Key:', supabaseKey.substring(0, 20) + '...\n')

    // Test 1: Check if post_comments table exists
    console.log('📊 Test 1: Checking post_comments table...')
    const { data: tables, error: tableError } = await supabase
      .from('post_comments')
      .select('*')
      .limit(1)

    if (tableError) {
      if (tableError.message.includes('relation "public.post_comments" does not exist')) {
        console.log('❌ Table does not exist!')
        console.log('📝 Please run the migration first:')
        console.log('   1. Open: https://supabase.com/dashboard/project/gbmvzpslsakkuwdvmiit/editor')
        console.log('   2. Run the SQL from SETUP_COMMENTS.md\n')
        return false
      }
      console.log('❌ Error:', tableError.message)
      return false
    }
    
    console.log('✅ Table exists!\n')

    // Test 2: Check posts table
    console.log('📊 Test 2: Checking posts table...')
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, caption')
      .limit(3)

    if (postsError) {
      console.log('❌ Error:', postsError.message)
      return false
    }
    
    console.log(`✅ Found ${posts?.length || 0} posts`)
    if (posts && posts.length > 0) {
      console.log('   Sample post:', posts[0].id, '-', posts[0].caption?.substring(0, 50))
    }
    console.log()

    // Test 3: Check profiles table
    console.log('📊 Test 3: Checking profiles table...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name')
      .limit(3)

    if (profilesError) {
      console.log('❌ Error:', profilesError.message)
      return false
    }
    
    console.log(`✅ Found ${profiles?.length || 0} profiles`)
    if (profiles && profiles.length > 0) {
      console.log('   Sample user:', profiles[0].name)
    }
    console.log()

    console.log('🎉 All tests passed!')
    console.log('✅ Comments feature is ready to use!\n')
    return true

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    return false
  }
}

testConnection()
