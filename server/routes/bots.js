/**
 * Bot routes.
 * GET  /api/bots          — public, list all (optional ?category=)
 * GET  /api/bots/:id      — public, single bot
 * POST /api/bots          — protected, create a bot
 */
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { getBots, getBot, createBot } = require('../controllers/botController');

router.get('/', getBots);
router.get('/:id', getBot);
router.post('/', authenticate, createBot);

module.exports = router;
