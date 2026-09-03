const fp = require('fastify-plugin');
const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');

async function supabasePlugin(fastify, options) {
  const supabaseUrl = config.SUPABASE_URL;
  const supabaseKey = config.SUPABASE_ANON_KEY;
  const supabaseServiceKey = config.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    fastify.log.warn('Supabase URL or Anon Key not provided. Supabase plugin will not be fully functional.');
  }

  const supabase = createClient(
    supabaseUrl || 'http://localhost:54321', 
    supabaseKey || 'dummy_key'
  );

  let supabaseAdmin = null;
  if (supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  }

  fastify.decorate('supabase', supabase);
  if (supabaseAdmin) {
    fastify.decorate('supabaseAdmin', supabaseAdmin);
  }
}

module.exports = fp(supabasePlugin);
