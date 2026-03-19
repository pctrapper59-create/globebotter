/**
 * One-time script — update bots with correct Stripe price IDs, prices, and pricing model.
 * Run: node server/scripts/updateBotPrices.js
 *
 * pricing_model: 'once' | 'subscription' | 'both'
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const pool = require('../config/db');

const BOTS = [
  {
    slug: 'ai-lead-generator',
    price: 79.00,
    stripe_price_id_once:    'price_1TCNf8RMcin8b0U1Z2bUcm2k',
    stripe_price_id_monthly: null,
    pricing_model: 'once',
  },
  {
    slug: 'ai-outreach-bot',
    price: 99.00,
    stripe_price_id_once:    'price_1TCNf8RMcin8b0U1BJyDqAOI',
    stripe_price_id_monthly: null,
    pricing_model: 'once',
  },
  {
    slug: 'ai-automation-suite',
    price: 29.00,
    stripe_price_id_once:    null,
    stripe_price_id_monthly: 'price_1TCNf8RMcin8b0U1APpuj8kC',
    pricing_model: 'subscription',
  },
];

async function run() {
  // Add pricing_model column if it doesn't exist
  await pool.query(`
    ALTER TABLE bots
    ADD COLUMN IF NOT EXISTS pricing_model VARCHAR(20) DEFAULT 'both',
    ADD COLUMN IF NOT EXISTS stripe_price_id_once    VARCHAR(255),
    ADD COLUMN IF NOT EXISTS stripe_price_id_monthly VARCHAR(255)
  `);
  console.log('✅ Columns ensured');

  for (const bot of BOTS) {
    const result = await pool.query(
      `UPDATE bots
       SET price                  = $1,
           stripe_price_id_once   = $2,
           stripe_price_id_monthly = $3,
           pricing_model          = $4
       WHERE slug = $5
       RETURNING id, name, price, pricing_model`,
      [bot.price, bot.stripe_price_id_once, bot.stripe_price_id_monthly, bot.pricing_model, bot.slug]
    );
    if (result.rows[0]) {
      console.log(`✅ Updated: ${result.rows[0].name} — $${result.rows[0].price} (${result.rows[0].pricing_model})`);
    } else {
      console.warn(`⚠️  Not found: slug="${bot.slug}"`);
    }
  }

  await pool.end();
  console.log('\nDone.');
}

run().catch((err) => { console.error(err); process.exit(1); });
