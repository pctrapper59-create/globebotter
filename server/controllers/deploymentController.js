/**
 * Deployment controller — stubbed out.
 * Real deployment feature is coming in a future phase.
 *
 * POST  /api/deployments          — 501 coming soon
 * GET   /api/deployments          — 200 empty list
 * PATCH /api/deployments/:id/stop — 501 coming soon
 */

const deploy = async (req, res) => {
  res.status(501).json({ error: 'Deployment feature coming soon.' });
};

const getDeployments = async (req, res) => {
  res.status(200).json({ deployments: [], message: 'Deployment feature coming soon.' });
};

const stopDeployment = async (req, res) => {
  res.status(501).json({ error: 'Deployment feature coming soon.' });
};

module.exports = { deploy, getDeployments, stopDeployment };
