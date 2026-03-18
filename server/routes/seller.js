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
const { getMyBots, uploadBot, getSales, getStats } = require('../controllers/sellerController');

router.use(authenticate); // all seller routes require JWT

router.get('/bots',  getMyBots);
router.post('/bots', uploadBot);
router.get('/sales', getSales);
router.get('/stats', getStats);

module.exports = router;
