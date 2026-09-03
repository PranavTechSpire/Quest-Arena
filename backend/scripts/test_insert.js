const { Client } = require('pg');
require('dotenv').config();

async function testInsert() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  
  try {
    const res = await client.query(`
      INSERT INTO public.users (id, username, email, exam_preference)
      VALUES (
        '11111111-1111-1111-1111-111111111111',
        'chavanpranav3535',
        'chavanpranav3535@gmail.com',
        'UPSC_GS1'::exam_type
      ) RETURNING *;
    `);
    console.log('Success:', res.rows);
  } catch (e) {
    console.log('Error during INSERT:', e.message);
  }
  
  // Clean up
  try {
    await client.query("DELETE FROM public.users WHERE id = '11111111-1111-1111-1111-111111111111'");
  } catch (e) {}

  await client.end();
}
testInsert();
