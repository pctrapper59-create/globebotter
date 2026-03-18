/**
 * Bot-run routes.
 *
 * POST /api/run/:deploymentId — authenticate + runBot controller
 *
 * Wire into app.js with:
 *   const botRunRoutes = require('./routes/botRun');
 *   app.use('/api/run', botRunRoutes);
 */

const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/auth');
const { runBot }   = require('../controllers/botRunController');

router.post('/:deploymentId', authenticate, runBot);

module.exports = router;
