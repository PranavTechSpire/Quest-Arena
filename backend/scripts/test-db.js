const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

async function runTests() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Start transaction to rollback at the end
    await client.query('BEGIN');

    console.log('--- Testing Users ---');
    const userRes = await client.query(`
      INSERT INTO public.users (id, username, email, role, avatar_state)
      VALUES (gen_random_uuid(), 'testuser1', 'test1@example.com', 'student', 'Neutral/Focused')
      RETURNING id
    `);
    const userId = userRes.rows[0].id;
    console.log('User created:', userId);

    try {
      await client.query('SAVEPOINT dup_user');
      await client.query(`
        INSERT INTO public.users (id, username, email, role)
        VALUES (gen_random_uuid(), 'testuser1', 'duplicate@example.com', 'student')
      `);
      throw new Error('Duplicate username allowed!');
    } catch (e) {
      await client.query('ROLLBACK TO SAVEPOINT dup_user');
      if (e.code === '23505') console.log('Duplicate username rejected (Expected).');
      else throw e;
    }

    console.log('--- Testing Questions ---');
    const qRes = await client.query(`
      INSERT INTO public.questions (exam, subject, topic, question_text, options, correct_option, status, created_by)
      VALUES ('UPSC_GS1', 'Polity', 'Fundamental Rights', 'What is Article 21?', '{"a":"Life", "b":"Liberty", "c":"Both", "d":"None"}', 'c', 'approved', $1)
      RETURNING id
    `, [userId]);
    const qId = qRes.rows[0].id;
    console.log('Question created:', qId);

    console.log('--- Testing Daily Attempts ---');
    const qsRes = await client.query(`
      INSERT INTO public.quiz_sessions (user_id, exam) VALUES ($1, 'UPSC_GS1') RETURNING id
    `, [userId]);
    const qsId = qsRes.rows[0].id;

    await client.query(`
      INSERT INTO public.daily_attempts (user_id, quiz_session_id, exam, attempt_date, net_score)
      VALUES ($1, $2, 'UPSC_GS1', current_date, 10.5)
    `, [userId, qsId]);
    console.log('Daily attempt created.');

    try {
      await client.query('SAVEPOINT dup_attempt');
      await client.query(`
        INSERT INTO public.daily_attempts (user_id, quiz_session_id, exam, attempt_date, net_score)
        VALUES ($1, $2, 'UPSC_GS1', current_date, 15)
      `, [userId, qsId]);
      throw new Error('Duplicate daily attempt allowed!');
    } catch (e) {
      await client.query('ROLLBACK TO SAVEPOINT dup_attempt');
      if (e.code === '23505') console.log('Duplicate daily attempt rejected (Expected).');
      else throw e;
    }

    console.log('--- Testing Matches ---');
    const guestRes = await client.query(`
      INSERT INTO public.users (id, username, email) VALUES (gen_random_uuid(), 'guestuser1', 'guest@example.com') RETURNING id
    `);
    const guestId = guestRes.rows[0].id;

    const matchRes = await client.query(`
      INSERT INTO public.custom_matches (room_code, host_id, guest_id, exam, status)
      VALUES ('A1B2', $1, $2, 'UPSC_GS1', 'active') RETURNING id
    `, [userId, guestId]);
    const matchId = matchRes.rows[0].id;
    
    await client.query(`
      INSERT INTO public.match_rounds (match_id, question_id, round_number)
      VALUES ($1, $2, 1)
    `, [matchId, qId]);
    console.log('Match and round created.');

    console.log('--- Testing Curator Audit ---');
    await client.query(`
      INSERT INTO public.curator_audit_logs (actor_id, action, entity_type, entity_id, reason)
      VALUES ($1, 'create', 'question', $2, 'Added initial question')
    `, [userId, qId]);
    console.log('Curator audit log created.');

    // Rollback to avoid test pollution
    await client.query('ROLLBACK');
    console.log('All database integrity tests PASSED. Rolled back successfully.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runTests();
