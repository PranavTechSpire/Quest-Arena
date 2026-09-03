const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function run() {
  console.log('1. Attempting sign up...');
  const { data, error } = await supabase.auth.signUp({
    email: 'test_debug_' + Date.now() + '@example.com',
    password: 'password123',
  });
  
  console.log('SignUp Error:', error?.message);
  
  console.log('2. Checking debug_logs...');
  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await pgClient.connect();
  const res = await pgClient.query('SELECT * FROM public.debug_logs ORDER BY created_at DESC LIMIT 5');
  console.log('Logs:', res.rows);
  await pgClient.end();
}
run();
