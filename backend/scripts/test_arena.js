
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // 1. Sign up/in a user to get JWT
  const email = 'test_arena@test.com';
  const { data: authData } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });
  
  const { data: loginData } = await supabase.auth.signInWithPassword({
    email,
    password: 'password123'
  });
  
  const token = loginData.session.access_token;
  
  // 2. Call /arena/create
  console.log('Calling /arena/create...');
  const res = await fetch('http://localhost:3000/api/v1/arena/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text);
}

run().catch(console.error);
