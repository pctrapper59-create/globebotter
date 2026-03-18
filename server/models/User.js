/**
 * User model — raw SQL queries via pg pool.
 * Keeps DB logic out of controllers.
 */
const pool = require('../config/db');

const findByEmail = async (email) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
};

const findById = async (id) => {
  const result = await pool.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};

const create = async ({ name, email, hashedPassword }) => {
  const result = await pool.query(
    `INSERT INTO users (name, email, password)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, role, created_at`,
    [name, email, hashedPassword]
  );
  return result.rows[0];
};

module.exports = { findByEmail, findById, create };
