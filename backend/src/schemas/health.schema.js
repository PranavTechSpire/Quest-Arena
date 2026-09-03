const healthResponseSchema = {
  $id: 'healthResponseSchema',
  type: 'object',
  properties: {
    status: { type: 'string' },
    timestamp: { type: 'string', format: 'date-time' },
    services: {
      type: 'object',
      properties: {
        database: { type: 'string' },
        redis: { type: 'string' }
      }
    }
  }
};

module.exports = {
  healthResponseSchema
};
