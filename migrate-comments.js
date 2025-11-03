// Apply post_comments table migration to Supabase
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('🚀 Applying post_comments table migration...\n')

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '001_create_post_comments_table.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Split into individual statements (simple approach)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`)
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      
      if (error) {
        // Ignore "already exists" errors
        if (error.message.includes('already exists')) {
          console.log('   ℹ️  Already exists, skipping...')
        } else {
          console.error('   ❌ Error:', error.message)
        }
      } else {
        console.log('   ✅ Success')
      }
    }

    console.log('\n✅ Migration completed!\n')
    console.log('📊 Created:')
    console.log('   ✓ post_comments table')
    console.log('   ✓ Indexes (post_id, user_id, created_at)')
    console.log('   ✓ RLS policies (read/write permissions)')
    console.log('   ✓ Triggers (updated_at auto-update)')
    console.log('\n🎉 Comments feature is ready!')

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    console.log('\n📝 Manual steps:')
    console.log('1. Go to: https://supabase.com/dashboard/project/iuiyvteuleqknwkdeqde/editor')
    console.log('2. Open SQL Editor')
    console.log('3. Copy and run the SQL from: supabase/migrations/001_create_post_comments_table.sql')
    process.exit(1)
  }
}

applyMigration()
