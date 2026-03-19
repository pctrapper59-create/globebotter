'use strict';
const rateLimit = require('express-rate-limit');

// NOTE: In-memory store resets on each cold start (Netlify Functions).
// TODO: Upgrade to rate-limit-redis + @upstash/redis for persistent limits across instances.
// See .planning/research/security-hardening.md Section 1 for implementation details.

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

module.exports = { authLimiter, aiLimiter, generalLimiter };
