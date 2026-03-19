/**
 * Server entry point.
 * Loads env vars, then starts the Express listener.
 */
require('dotenv').config({ path: '../.env' });

const REQUIRED_ENV = ['JWT_SECRET', 'DATABASE_URL', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'OPENAI_API_KEY'];
const missing = REQUIRED_ENV.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error(`[startup] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`GlobeBotter API running on http://localhost:${PORT}`);
});
