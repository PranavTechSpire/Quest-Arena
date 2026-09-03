const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await pgClient.connect();
  
  const res = await pgClient.query('SELECT * FROM public.debug_logs ORDER BY created_at DESC LIMIT 5');
  console.log('Logs:', res.rows);
  
  await pgClient.end();
}
run();
