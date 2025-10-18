// Simple test script to check Supabase configuration
const { createClient } = require('@supabase/supabase-js')

// Check environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Environment check:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET')
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'NOT SET')

if (supabaseUrl && supabaseAnonKey) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    console.log('Supabase client created successfully')

    // Test a simple query
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('Error getting session:', error.message)
      } else {
        console.log('Session check successful, no active session (expected)')
      }
    })
  } catch (error) {
    console.error('Error creating Supabase client:', error.message)
  }
} else {
  console.error('Cannot create Supabase client - missing environment variables')
}