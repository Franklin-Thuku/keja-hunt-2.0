require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('Checking environment variables...');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'MISSING');

if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  try {
    console.log('\nTesting Supabase connection...');
    console.log('Using URL:', process.env.SUPABASE_URL);
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    // Test connection by trying to fetch users
    supabase
      .from('users')
      .select('count')
      .then(({ data, error }) => {
        if (error) {
          console.error('Supabase connection failed:', error.message);
        } else {
          console.log('✅ Supabase connection successful!');
          console.log('Users table accessible');
        }
      })
      .catch(err => {
        console.error('Supabase connection error:', err.message);
      });
  } catch (error) {
    console.error('Error creating Supabase client:', error.message);
  }
} else {
  console.log('\n❌ Missing required environment variables');
  console.log('Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file');
}
