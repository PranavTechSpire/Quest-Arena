const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await pgClient.connect();
  
  try {
    const res = await pgClient.query(`
      SELECT COALESCE((NULL::jsonb->>'exam_preference')::exam_type, 'UPSC_GS1'::exam_type) as test;
    `);
    console.log('Result:', res.rows);
  } catch (e) {
    console.log('Error:', e.message);
  }

  await pgClient.end();
}
run();
