async function authRoutes(fastify, options) {
  
  // NOTE: In Phase 1, we rely on Supabase Auth for actual auth.
  // These routes act as wrappers if we want to augment auth behavior later,
  // or they just delegate directly.
  
  fastify.post('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'username'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          username: { type: 'string', minLength: 3 }
        }
      }
    }
  }, async (request, reply) => {
    const { email, password, username } = request.body;
    
    // In a real flow we'd have AuthController -> AuthService -> Supabase
    const { data, error } = await fastify.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    });

    if (error) {
      return reply.status(400).send({ error: error.message });
    }

    return reply.status(201).send({ message: 'Registration successful', user: data.user });
  });

  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { email, password } = request.body;
    
    const { data, error } = await fastify.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return reply.status(401).send({ error: error.message });
    }

    return reply.send({ session: data.session });
  });

  fastify.post('/logout', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    const token = request.headers.authorization.replace('Bearer ', '');
    const { error } = await fastify.supabase.auth.admin.signOut(token); // Or simple signOut if using client auth
    
    if (error) {
      fastify.log.error('Logout error', error);
      return reply.status(500).send({ error: 'Logout failed' });
    }
    
    return reply.send({ message: 'Logged out successfully' });
  });
}

module.exports = authRoutes;
