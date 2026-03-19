/**
 * Express app factory.
 * Separated from index.js so tests can import without starting a listener.
 *
 * NOTE: Stripe webhook route must receive a raw Buffer — it is registered
 * BEFORE express.json() using express.raw().
 */
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');

const authRoutes    = require('./routes/auth');
const botRoutes     = require('./routes/bots');
const paymentRoutes = require('./routes/payments');
const sellerRoutes     = require('./routes/seller');
const deploymentRoutes = require('./routes/deployments');
const botRunRoutes     = require('./routes/botRun');
const leadsRoutes      = require('./routes/leads');
const outreachRoutes   = require('./routes/outreach');

const allowedOrigins = require('./config/allowedOrigins');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: false,
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// Stripe webhook needs the raw body — mount BEFORE express.json()
app.use(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' })
);

app.use(express.json());

// Routes
app.use('/api/auth',     authRoutes);
app.use('/api/bots',     botRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/seller',      sellerRoutes);
app.use('/api/deployments', deploymentRoutes);
app.use('/api/run',         botRunRoutes);
app.use('/api/leads',       leadsRoutes);
app.use('/api/outreach',    outreachRoutes);
app.use('/api/automation', require('./routes/automation'));

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// 404 fallback
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

module.exports = app;
