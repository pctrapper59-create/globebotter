/**
 * Payment controller — Stripe Checkout sessions + webhook handler.
 *
 * POST /api/payments/checkout   → creates a Stripe Checkout session
 * POST /api/payments/webhook    → handles Stripe events (raw body required)
 * GET  /api/payments/my         → buyer's purchases + subscriptions
 */
const stripe       = require('../config/stripe');
const pool         = require('../config/db');
const Bot          = require('../models/Bot');
const Purchase     = require('../models/Purchase');
const Subscription = require('../models/Subscription');
const User         = require('../models/User');
const emailService = require('../services/emailService');

// ── Create Checkout session ──────────────────────────────────────────────────
const createCheckout = async (req, res) => {
  try {
    const { bot_id, mode } = req.body; // mode: 'payment' | 'subscription'
    const user_id = req.user.userId;

    if (!bot_id || !mode) {
      return res.status(400).json({ error: 'bot_id and mode are required' });
    }
    if (!['payment', 'subscription'].includes(mode)) {
      return res.status(400).json({ error: 'mode must be "payment" or "subscription"' });
    }

    const bot = await Bot.findById(bot_id);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });

    const priceId =
      mode === 'subscription'
        ? bot.stripe_price_id_monthly
        : bot.stripe_price_id_once;

    // If no Stripe price IDs are configured yet, build them on the fly
    // (for dev/demo — in prod sellers configure these via seller dashboard)
    let lineItems;
    if (priceId) {
      lineItems = [{ price: priceId, quantity: 1 }];
    } else {
      lineItems = [{
        price_data: {
          currency: 'usd',
          product_data: { name: bot.name, description: bot.description },
          unit_amount: Math.round(Number(bot.price) * 100),
          ...(mode === 'subscription' ? { recurring: { interval: 'month' } } : {}),
        },
        quantity: 1,
      }];
    }

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: lineItems,
      success_url: `${process.env.CLIENT_URL}/dashboard?success=1&bot_id=${bot_id}`,
      cancel_url:  `${process.env.CLIENT_URL}/marketplace/${bot_id}?canceled=1`,
      metadata: { user_id, bot_id, mode },
      client_reference_id: user_id,
    });

    // Record pending purchase immediately (webhook will mark completed)
    if (mode === 'payment') {
      await Purchase.create({
        user_id,
        bot_id,
        amount_paid: bot.price,
        stripe_session_id: session.id,
      });
    }

    res.json({ url: session.url });
  } catch (err) {
    console.error('createCheckout error:', err);
    res.status(500).json({ error: 'Could not create checkout session' });
  }
};

// ── Stripe webhook ───────────────────────────────────────────────────────────
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,                          // raw Buffer (see app.js)
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { user_id, bot_id, mode } = session.metadata;

        if (mode === 'payment') {
          await Purchase.markCompleted(session.id);
        }

        if (mode === 'subscription' && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          await Subscription.create({
            user_id,
            bot_id,
            stripe_subscription_id: sub.id,
            stripe_price_id: sub.items.data[0].price.id,
            period_start: new Date(sub.current_period_start * 1000),
            period_end:   new Date(sub.current_period_end   * 1000),
          }); // returns null on duplicate — that's OK, idempotent
        }

        // Backfill stripe_customer_id if not yet set
        if (session.customer) {
          await pool.query(
            'UPDATE users SET stripe_customer_id = $1 WHERE id = $2 AND stripe_customer_id IS NULL',
            [session.customer, user_id]
          );
        }

        // Send purchase confirmation email — non-blocking, never fails the webhook
        Promise.all([Bot.findById(bot_id), User.findById(user_id)])
          .then(([bot, user]) => {
            if (bot && user) {
              emailService.sendPurchaseConfirmation({
                email: user.email,
                name: user.name,
                botName: bot.name,
                amount: bot.price,
              }).catch(() => {});
            }
          })
          .catch(() => {});

        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await Subscription.updateStatus(sub.id, sub.status, {
          period_start: new Date(sub.current_period_start * 1000),
          period_end:   new Date(sub.current_period_end   * 1000),
          canceled_at:  sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
        });
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('webhook handler error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// ── Buyer's purchases + subscriptions ───────────────────────────────────────
const getMyPurchases = async (req, res) => {
  try {
    const user_id = req.user.userId;
    const [purchases, subscriptions] = await Promise.all([
      Purchase.findByUser(user_id),
      Subscription.findByUser(user_id),
    ]);
    res.json({ purchases, subscriptions });
  } catch (err) {
    console.error('getMyPurchases error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── Check if user has access to a bot ───────────────────────────────────────
const hasAccess = async (req, res) => {
  try {
    const user_id = req.user.userId;
    const { bot_id } = req.params;

    const bot = await Bot.findById(bot_id);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });

    const [owns, subscribed] = await Promise.all([
      Purchase.userOwnsBot(user_id, bot.id),
      Subscription.userHasActive(user_id, bot.id),
    ]);

    res.json({ hasAccess: owns || subscribed });
  } catch (err) {
    console.error('hasAccess error:', err);
    return res.status(200).json({ hasAccess: false });
  }
};

module.exports = { createCheckout, handleWebhook, getMyPurchases, hasAccess };
