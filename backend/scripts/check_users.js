const { Client } = require('pg');
require('dotenv').config();

async function check() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  const res = await client.query('SELECT id, email, username FROM public.users');
  console.log('Public Users:', res.rows);
  
  // Let's also check auth.users if possible (usually requires superuser, but maybe this connection string is postgres role)
  try {
      const authRes = await client.query('SELECT id, email FROM auth.users');
      console.log('Auth Users:', authRes.rows);
  } catch (e) {
      console.log('Could not read auth.users:', e.message);
  }
  
  await client.end();
}
check();
