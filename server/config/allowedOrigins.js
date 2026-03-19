'use strict';

const allowedOrigins = [
  process.env.CLIENT_URL,           // production Netlify URL
  'http://localhost:3000',           // Next.js dev
  'http://localhost:8888',           // Netlify dev CLI
].filter(Boolean);                   // remove undefined if CLIENT_URL not set

module.exports = allowedOrigins;
