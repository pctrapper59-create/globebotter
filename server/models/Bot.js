/**
 * Bot model — raw SQL queries via pg pool.
 * Supports optional category filtering on findAll.
 */
const pool = require('../config/db');

const findAll = async ({ category, search } = {}) => {
  const conditions = [];
  const params = [];

  if (category) {
    conditions.push(`category = $${params.length + 1}`);
    params.push(category);
  }

  if (search) {
    conditions.push(`(name ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`);
    params.push(`%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT * FROM bots ${where} ORDER BY created_at DESC`,
    params
  );
  return result.rows;
};

const findById = async (id) => {
  const result = await pool.query('SELECT * FROM bots WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const create = async ({ name, description, price, category, creator_id }) => {
  const result = await pool.query(
    `INSERT INTO bots (name, description, price, category, creator_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, description, price, category, creator_id]
  );
  return result.rows[0];
};

module.exports = { findAll, findById, create };
