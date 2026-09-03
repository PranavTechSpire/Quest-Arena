const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await pgClient.connect();
  
  await pgClient.query('DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;');
  
  console.log('Trigger dropped. Now testing signup...');
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  
  const { data, error } = await supabase.auth.signUp({
    email: 'pranav_test_' + Date.now() + '@gmail.com',
    password: 'password123',
  });
  console.log('SignUp without trigger Error:', error?.message);
  
  await pgClient.end();
}
run();
