/**
 * Leads routes — AI Lead Generator Bot
 * POST /api/leads/search — search local businesses + generate AI messages
 */
const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/auth');
const { searchLeads } = require('../controllers/leadController');
const validate = require('../middleware/validate');
const { leadSearchSchema } = require('../schemas/leads');

router.post('/search', authenticate, validate(leadSearchSchema), searchLeads);

module.exports = router;
