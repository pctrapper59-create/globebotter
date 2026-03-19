/**
 * Leads routes — AI Lead Generator Bot
 * POST /api/leads/search — search local businesses + generate AI messages
 */
const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/auth');
const { searchLeads } = require('../controllers/leadController');

router.post('/search', authenticate, searchLeads);

module.exports = router;
