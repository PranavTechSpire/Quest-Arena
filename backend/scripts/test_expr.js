const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await pgClient.connect();
  
  try {
    const res = await pgClient.query(`
      SELECT 
        COALESCE(NULL->>'username', split_part('chavanpranav3535@gmail.com', '@', 1)) as username,
        COALESCE((NULL->>'exam_preference')::exam_type, 'UPSC_GS1'::exam_type) as exam_pref;
    `);
    console.log('Test 1:', res.rows[0]);
  } catch (e) { console.log('Test 1 Error:', e.message); }

  try {
    const res = await pgClient.query(`
      SELECT 
        COALESCE('{}'::jsonb->>'username', split_part('chavanpranav3535@gmail.com', '@', 1)) as username,
        COALESCE(('{}'::jsonb->>'exam_preference')::exam_type, 'UPSC_GS1'::exam_type) as exam_pref;
    `);
    console.log('Test 2:', res.rows[0]);
  } catch (e) { console.log('Test 2 Error:', e.message); }

  await pgClient.end();
}
run();
