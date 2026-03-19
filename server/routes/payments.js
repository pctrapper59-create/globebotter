/**
 * Payment routes.
 * POST /api/payments/checkout  — create Stripe Checkout session (auth required)
 * POST /api/payments/webhook   — Stripe webhook (raw body, no auth)
 * GET  /api/payments/my        — buyer's purchase history (auth required)
 */
const express    = require('express');
const router     = express.Router();
const authenticate = require('../middleware/auth');
const { createCheckout, handleWebhook, getMyPurchases, hasAccess } = require('../controllers/paymentController');

// Webhook must receive raw body — handled in app.js with express.raw()
router.post('/webhook', handleWebhook);

router.post('/checkout',          authenticate, createCheckout);
router.get('/my',                 authenticate, getMyPurchases);
router.get('/has-access/:bot_id', authenticate, hasAccess);

module.exports = router;
