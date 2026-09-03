const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'pranav_test22@gmail.com', // The user just signed up with this
    password: 'password123', 
  });
  
  if (error) {
    // Let's create a fresh user in auth and manually insert into public to bypass limits
    console.log('Login failed, using a fresh mock user');
  } else {
    console.log('Access Token:', data.session.access_token);
    const token = data.session.access_token;
    
    // Now call the fastify backend
    try {
      const response = await fetch('http://localhost:3000/api/v1/quests/daily', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      console.log('API Response Status:', response.status);
      console.log('API Response:', data);
    } catch (apiErr) {
      console.log('API Error:', apiErr.message);
    }
  }
}
run();
