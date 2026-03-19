/**
 * Seller routes — all protected.
 * GET  /api/seller/bots
 * POST /api/seller/bots
 * GET  /api/seller/sales
 * GET  /api/seller/stats
 */
const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const { getMyBots, uploadBot, getSales, getStats } = require('../controllers/sellerController');
const validate = require('../middleware/validate');
const { createBotSchema } = require('../schemas/bot');

router.use(authenticate); // all seller routes require JWT

router.get('/bots',  getMyBots);
router.post('/bots', requireRole('seller', 'admin'), validate(createBotSchema), uploadBot);
router.get('/sales', getSales);
router.get('/stats', getStats);

module.exports = router;
