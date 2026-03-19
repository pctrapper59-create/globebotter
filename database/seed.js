/**
 * Seeds the database with the 3 flagship bots + an admin user.
 * Run: node database/seed.js
 */
const path = require('path');
const fs   = require('fs');

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
      description: 'The ultimate all-in-one automation suite. Automate your entire workflow, save hours of work daily, and grow your business with AI-powered tools that work 24/7. Includes lead gen, outreach, social media scheduling, and analytics in one powerful package.',
      price: 29.00,
      category: 'custom',
      stripe_price_id_monthly: 'price_1TCMgvEjDlkmOvOijQz2rvUZ',
      stripe_price_id_once: null,
    },
    {
      slug: 'ai-lead-generator',
      name: 'AI Lead Generator Bot',
      description: 'Find and extract local business leads on autopilot. Search any city and niche, extract contact details including emails and phone numbers, and export to CSV instantly. Perfect for agencies, freelancers, and sales teams looking to fill their pipeline fast.',
      price: 79.00,
      category: 'marketing',
      stripe_price_id_once: 'price_1TCMX6EjDlkmOvOiZq8zxggV',
      stripe_price_id_monthly: null,
    },
    {
      slug: 'ai-outreach-bot',
      name: 'AI Outreach Message Bot',
      description: 'Send personalized AI-written cold outreach emails at scale. Connect your email, define your target audience, and let the AI craft unique messages for each prospect. Get more replies, book more calls, and land more clients — all on autopilot.',
      price: 99.00,
      category: 'marketing',
      stripe_price_id_once: 'price_1TCMdaEjDlkmOvOiCaRuiBl6',
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
