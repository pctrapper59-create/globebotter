/**
 * Subscription model — recurring monthly access.
 */
const pool = require('../config/db');

const create = async ({ user_id, bot_id, stripe_subscription_id, stripe_price_id, period_start, period_end }) => {
  const result = await pool.query(
    `INSERT INTO subscriptions
       (user_id, bot_id, stripe_subscription_id, stripe_price_id,
        current_period_start, current_period_end, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'active')
     ON CONFLICT (stripe_subscription_id) DO NOTHING
     RETURNING *`,
    [user_id, bot_id, stripe_subscription_id, stripe_price_id, period_start, period_end]
  );
  return result.rows[0] || null;
};

const updateStatus = async (stripe_subscription_id, status, extra = {}) => {
  const result = await pool.query(
    `UPDATE subscriptions
     SET status = $2,
         current_period_start = COALESCE($3, current_period_start),
         current_period_end   = COALESCE($4, current_period_end),
         canceled_at          = COALESCE($5, canceled_at)
     WHERE stripe_subscription_id = $1
     RETURNING *`,
    [
      stripe_subscription_id, status,
      extra.period_start ?? null,
      extra.period_end   ?? null,
      extra.canceled_at  ?? null,
    ]
  );
  return result.rows[0];
};

const findByUser = async (user_id) => {
  const result = await pool.query(
    `SELECT s.*, b.name AS bot_name, b.category
     FROM subscriptions s JOIN bots b ON s.bot_id = b.id
     WHERE s.user_id = $1
     ORDER BY s.created_at DESC`,
    [user_id]
  );
  return result.rows;
};

const userHasActive = async (user_id, bot_id) => {
  const result = await pool.query(
    `SELECT 1 FROM subscriptions
     WHERE user_id = $1 AND bot_id = $2
       AND status IN ('active','trialing')
     LIMIT 1`,
    [user_id, bot_id]
  );
  return result.rows.length > 0;
};

module.exports = { create, updateStatus, findByUser, userHasActive };
