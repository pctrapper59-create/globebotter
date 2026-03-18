/**
 * PostgreSQL connection pool.
 * All models import this pool to run queries.
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;
