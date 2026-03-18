/**
 * Purchase model — one-time bot purchases.
 */
const pool = require('../config/db');

const create = async ({ user_id, bot_id, amount_paid, stripe_session_id }) => {
  const result = await pool.query(
    `INSERT INTO purchases (user_id, bot_id, amount_paid, stripe_session_id, status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING *`,
    [user_id, bot_id, amount_paid, stripe_session_id]
  );
  return result.rows[0];
};

const markCompleted = async (stripe_session_id) => {
  const result = await pool.query(
    `UPDATE purchases SET status = 'completed'
     WHERE stripe_session_id = $1 RETURNING *`,
    [stripe_session_id]
  );
  return result.rows[0];
};

const findByUser = async (user_id) => {
  const result = await pool.query(
    `SELECT p.*, b.name AS bot_name, b.category
     FROM purchases p JOIN bots b ON p.bot_id = b.id
     WHERE p.user_id = $1 AND p.status = 'completed'
     ORDER BY p.purchased_at DESC`,
    [user_id]
  );
  return result.rows;
};

const userOwnsBot = async (user_id, bot_id) => {
  const result = await pool.query(
    `SELECT 1 FROM purchases
     WHERE user_id = $1 AND bot_id = $2 AND status = 'completed'
     LIMIT 1`,
    [user_id, bot_id]
  );
  return result.rows.length > 0;
};

module.exports = { create, markCompleted, findByUser, userOwnsBot };
