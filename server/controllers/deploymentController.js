/**
 * Deployment controller — simulates bot deployment.
 * In production, this would trigger real infra (Docker, Lambda, etc.)
 *
 * POST /api/deployments        — deploy a bot the user owns
 * GET  /api/deployments        — list user's deployments
 * PATCH /api/deployments/:id/stop — stop a deployment
 */
const pool     = require('../config/db');
const Purchase = require('../models/Purchase');
const Sub      = require('../models/Subscription');

const deploy = async (req, res) => {
  try {
    const { bot_id } = req.body;
    const user_id    = req.user.userId;

    if (!bot_id) return res.status(400).json({ error: 'bot_id is required' });

    // Verify the user owns or has an active subscription for this bot
    const [owns, subscribed] = await Promise.all([
      Purchase.userOwnsBot(user_id, bot_id),
      Sub.userHasActive(user_id, bot_id),
    ]);

    if (!owns && !subscribed) {
      return res.status(403).json({ error: 'You must purchase or subscribe to this bot before deploying' });
    }

    // Simulate a short deployment delay — set to 'deploying' first
    const deployingResult = await pool.query(
      `INSERT INTO deployments (user_id, bot_id, status)
       VALUES ($1, $2, 'deploying') RETURNING *`,
      [user_id, bot_id]
    );
    const deployment = deployingResult.rows[0];

    // Simulate async completion — in prod this would be a real job/callback
    setTimeout(async () => {
      await pool.query(
        `UPDATE deployments SET status = 'active' WHERE id = $1`,
        [deployment.id]
      );
    }, 2000);

    res.status(201).json({
      deployment,
      message: 'Bot is deploying. Status will update to "active" shortly.',
    });
  } catch (err) {
    console.error('deploy error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getDeployments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, b.name AS bot_name, b.category
       FROM deployments d
       JOIN bots b ON d.bot_id = b.id
       WHERE d.user_id = $1
       ORDER BY d.deployed_at DESC`,
      [req.user.userId]
    );
    res.json({ deployments: result.rows });
  } catch (err) {
    console.error('getDeployments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const stopDeployment = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE deployments
       SET status = 'stopped', stopped_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Deployment not found' });
    res.json({ deployment: result.rows[0] });
  } catch (err) {
    console.error('stopDeployment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { deploy, getDeployments, stopDeployment };
