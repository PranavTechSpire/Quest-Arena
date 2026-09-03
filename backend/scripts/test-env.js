const config = require('../src/config/env');
console.log('Config SUPABASE_URL:', config.SUPABASE_URL);
console.log('Process.env SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('Config REDIS_URL:', config.REDIS_URL);
console.log('Process.env REDIS_URL:', process.env.REDIS_URL);
