/**
 * Seller controller.
 * GET  /api/seller/bots      — seller's own bot listings
 * POST /api/seller/bots      — upload a new bot
 * GET  /api/seller/sales     — purchases + subscriptions for seller's bots
 * GET  /api/seller/stats     — total revenue, total sales count
 */
const pool = require('../config/db');
const Bot  = require('../models/Bot');

const getMyBots = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM bots WHERE creator_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json({ bots: result.rows });
  } catch (err) {
    console.error('getMyBots error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const uploadBot = async (req, res) => {
  try {
    const { name, description, price, category } = req.body;

    if (!name || !description || price == null || !category) {
      return res.status(400).json({ error: 'name, description, price, and category are required' });
    }
    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }

    const bot = await Bot.create({
      name, description, price, category,
      creator_id: req.user.userId,
    });

    res.status(201).json({ bot });
  } catch (err) {
    console.error('uploadBot error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getSales = async (req, res) => {
  try {
    const seller_id = req.user.userId;

    const [purchases, subscriptions] = await Promise.all([
      pool.query(
        `SELECT p.id, p.amount_paid, p.purchased_at, p.status,
                u.name AS buyer_name, u.email AS buyer_email,
                b.name AS bot_name
         FROM purchases p
         JOIN bots b ON p.bot_id = b.id
         JOIN users u ON p.user_id = u.id
         WHERE b.creator_id = $1 AND p.status = 'completed'
         ORDER BY p.purchased_at DESC`,
        [seller_id]
      ),
      pool.query(
        `SELECT s.id, s.status, s.current_period_end, s.created_at,
                u.name AS buyer_name, u.email AS buyer_email,
                b.name AS bot_name, b.price
         FROM subscriptions s
         JOIN bots b ON s.bot_id = b.id
         JOIN users u ON s.user_id = u.id
         WHERE b.creator_id = $1
         ORDER BY s.created_at DESC`,
        [seller_id]
      ),
    ]);

    res.json({
      purchases: purchases.rows,
      subscriptions: subscriptions.rows,
    });
  } catch (err) {
    console.error('getSales error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getStats = async (req, res) => {
  try {
    const seller_id = req.user.userId;

    const result = await pool.query(
      `SELECT
         COUNT(p.id)::int                      AS total_sales,
         COALESCE(SUM(p.amount_paid), 0)       AS total_revenue,
         COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'active')::int
                                               AS active_subscriptions
       FROM bots b
       LEFT JOIN purchases     p ON p.bot_id = b.id AND p.status = 'completed'
       LEFT JOIN subscriptions s ON s.bot_id = b.id
       WHERE b.creator_id = $1`,
      [seller_id]
    );

    res.json({ stats: result.rows[0] });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getMyBots, uploadBot, getSales, getStats };
