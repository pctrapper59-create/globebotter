/**
 * Netlify Serverless Function — wraps the Express app with serverless-http.
 *
 * All /api/* requests are redirected here by netlify.toml.
 * On Netlify, environment variables are set in the dashboard (Site Settings →
 * Environment Variables) — dotenv is only needed for local `netlify dev`.
 */
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '../../.env' });
}

const serverless = require('serverless-http');
const app        = require('../../server/app');

// serverless-http converts the Netlify lambda event into a proper
// Express-compatible req/res pair, including preserving raw Buffer bodies
// (required for Stripe webhook signature verification).
module.exports.handler = serverless(app, {
  // Treat application/json as binary so Stripe's raw body check passes
  binary: ['application/octet-stream'],
});
