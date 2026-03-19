/**
 * Outreach routes.
 * POST /api/outreach/generate — generate 3 AI outreach messages (auth required)
 */
const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/auth');
const { generateOutreach } = require('../controllers/outreachController');

router.post('/generate', authenticate, generateOutreach);

module.exports = router;
