/**
 * Runs schema.sql against the Supabase PostgreSQL database.
 * Usage: node database/run-schema.js
 * Or:    DATABASE_URL=... node database/run-schema.js
 */
const path = require('path');
const fs   = require('fs');

// ── Manual .env loader (no dotenv dependency) ──────────────────────────────
if (!process.env.DATABASE_URL) {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8')
      .split('\n')
      .forEach(line => {
        const m = line.match(/^([^#=\s]+)\s*=\s*(.*)/);
        if (m) process.env[m[1]] = m[2].trim();
      });
  }
}

// ── pg from server/node_modules ────────────────────────────────────────────
const pgPath = path.join(__dirname, '../server/node_modules/pg');
const { Client } = require(pgPath);

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Connecting to Supabase...');
  await client.connect();
  console.log('Connected!');

  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  console.log('Running schema.sql...');
  await client.query(sql);
  console.log('Schema applied successfully!');

  await client.end();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
