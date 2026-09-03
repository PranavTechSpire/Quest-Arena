const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// The user put the DB connection string in DATABASE_URL
const connectionString = process.env.DATABASE_URL;

async function runMigration() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to remote PostgreSQL...');
    await client.connect();

    const sqlPath = path.join(__dirname, '../../supabase/migrations/20240109000000_realtime_matches.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration...');
    await client.query(sql);

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
