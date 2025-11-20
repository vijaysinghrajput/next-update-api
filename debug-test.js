// Quick debug test for Supabase connection
const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 Environment Check:')
console.log('Supabase URL:', supabaseUrl ? 'EXISTS' : 'MISSING')
console.log('Supabase Anon Key:', supabaseAnonKey ? 'EXISTS' : 'MISSING')

if (supabaseUrl && supabaseAnonKey) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  // Test database connection
  supabase.from('cities').select('count', { count: 'exact', head: true }).then(result => {
    console.log('🔍 Database Test:', result.error ? 'FAILED' : 'SUCCESS')
    if (result.error) {
      console.error('Database Error:', result.error)
    } else {
      console.log('Cities count:', result.count)
    }
    process.exit(0)
  }).catch(err => {
    console.error('Connection Error:', err)
    process.exit(1)
  })
} else {
  console.log('❌ Missing environment variables')
  process.exit(1)
}