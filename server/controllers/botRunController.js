/**
 * botRunController.js
 *
 * POST /api/run/:deploymentId
 *
 * Requires JWT auth (req.user.userId set by authenticate middleware).
 * Looks up the deployment, verifies ownership + active status,
 * then proxies the user's prompt to the configured AI provider.
 *
 * Responses:
 *   200 { output, model, tokens }   — success
 *   400 { error }                   — prompt missing
 *   401 { error }                   — no / invalid JWT (handled by middleware)
 *   403 { error }                   — deployment not found, wrong owner, or not active
 *   503 { error }                   — AI API key not configured
 *   500 { error }                   — unexpected server error
 */

const pool      = require('../config/db');
const aiService = require('../services/aiService');

const runBot = async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const userId           = req.user.userId;
    const { prompt }       = req.body;

    // 1. Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({ error: 'prompt is required' });
    }

    // 2. Look up deployment
    const result = await pool.query(
      'SELECT * FROM deployments WHERE id = $1',
      [deploymentId]
    );

    const deployment = result.rows[0];

    // 3. Verify ownership and active status
    if (!deployment || deployment.user_id !== userId || deployment.status !== 'active') {
      return res
        .status(403)
        .json({ error: 'Deployment not found, not owned by you, or not active' });
    }

    // 4. Call AI service
    const aiResult = await aiService.runBot({ prompt: prompt.trim(), provider: 'openai' });

    return res.status(200).json(aiResult);
  } catch (err) {
    if (err.message === 'API key not configured') {
      return res.status(503).json({ error: 'API key not configured' });
    }
    console.error('botRunController error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { runBot };
