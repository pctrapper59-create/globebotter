/**
 * Seeds the database with the 3 flagship bots + an admin user.
 * Run: node database/seed.js
 */
const path = require('path');
const fs   = require('fs');

// ── Canonical Stripe Price IDs ──────────────────────────────────────────
// These must match the live Stripe Dashboard. Last verified: 2026-03-19
// Source of truth: server/scripts/updateBotPrices.js (ran against prod DB)
//   AI Lead Generator  one-time:  price_1TCNf8RMcin8b0U1Z2bUcm2k
//   AI Outreach Bot    one-time:  price_1TCNf8RMcin8b0U1BJyDqAOI
//   AI Auto Suite      monthly:   price_1TCNf8RMcin8b0U1APpuj8kC
// ────────────────────────────────────────────────────────────────────────

// Load .env manually
const envPath = path.join(__dirname, '../.env');
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([^#=\s]+)\s*=\s*(.*)/);
  if (m) process.env[m[1]] = m[2].trim();
});

const pgPath = path.join(__dirname, '../server/node_modules/pg');
const { Client } = require(pgPath);

const bcryptPath = path.join(__dirname, '../server/node_modules/bcryptjs');
const bcrypt = require(bcryptPath);

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected!');

  // ── 1. Create admin/seller user ───────────────────────────────────────────
  const hash = await bcrypt.hash('Admin1234!', 10);
  const userRes = await client.query(`
    INSERT INTO users (name, email, password, role)
    VALUES ('GlobeBotter Admin', 'admin@globebotter.com', $1, 'seller')
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `, [hash]);
  const adminId = userRes.rows[0].id;
  console.log('Admin user id:', adminId);

  // ── 3. Seed the 3 featured bots ───────────────────────────────────────────
  const bots = [
    {
      slug: 'ai-automation-suite',
      name: 'AI Automation Suite',
      description: 'The complete AI business toolkit. Includes Lead Finder, Outreach Messages, Follow-Up Sequences, Email Drip Campaigns, Social Media Content Packs (12 posts/month), Proposal Generator, 30-Day Content Calendar, Business Bio Writer, and FAQ Generator. Everything you need to automate your entire workflow — one subscription. 9 tools in one subscription.',
      price: 29.00,
      category: 'custom',
      stripe_price_id_monthly: 'price_1TCNf8RMcin8b0U1APpuj8kC',
      stripe_price_id_once: null,
    },
    {
      slug: 'ai-lead-generator',
      name: 'AI Lead Generator',
      description: 'Find hundreds of potential clients in minutes. Enter any business type and location — our AI searches Google\'s business database, pulls contact info, and writes a personalized outreach message for every lead. Export to CSV and start closing.',
      price: 79.00,
      category: 'marketing',
      stripe_price_id_once: 'price_1TCNf8RMcin8b0U1Z2bUcm2k',
      stripe_price_id_monthly: null,
    },
    {
      slug: 'ai-outreach-bot',
      name: 'AI Outreach Bot',
      description: 'Turn cold prospects into warm conversations. Input any business name and our AI crafts a professional cold email, an Instagram DM, and a follow-up message — all personalized, all ready to copy and send in one click.',
      price: 99.00,
      category: 'marketing',
      stripe_price_id_once: 'price_1TCNf8RMcin8b0U1BJyDqAOI',
      stripe_price_id_monthly: null,
    },
  ];

  for (const bot of bots) {
    await client.query(`
      INSERT INTO bots (name, description, price, category, creator_id, slug, status,
                        stripe_price_id_once, stripe_price_id_monthly)
      VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8)
      ON CONFLICT (slug) DO UPDATE SET
        name                    = EXCLUDED.name,
        description             = EXCLUDED.description,
        price                   = EXCLUDED.price,
        stripe_price_id_once    = EXCLUDED.stripe_price_id_once,
        stripe_price_id_monthly = EXCLUDED.stripe_price_id_monthly
    `, [bot.name, bot.description, bot.price, bot.category, adminId, bot.slug,
        bot.stripe_price_id_once, bot.stripe_price_id_monthly]);
    console.log('Seeded:', bot.name);
  }

  console.log('\n✅ Seed complete!');
  await client.end();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
