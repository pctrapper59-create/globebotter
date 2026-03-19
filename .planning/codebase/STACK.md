# GlobeBotter — Technology Stack

## Overview
GlobeBotter is an AI bot marketplace. The repo is a monorepo with three top-level workspaces: `server/`, `client/`, and `netlify/`. A single `.env` file at the root is shared by all three.

---

## Languages & Runtime

| Layer | Language | Runtime |
|---|---|---|
| Backend API | JavaScript (CommonJS) | Node.js 18 (pinned in `netlify.toml`) |
| Frontend | JavaScript (ESM / JSX) | Node.js 18 (Next.js build) |
| Database schema | SQL (PostgreSQL dialect) | — |

No TypeScript is used anywhere; the codebase is plain JS throughout.

---

## Frontend — `client/`

**Framework:** Next.js 14 (`next@^14.2.35`) with the Pages Router
**React:** React 18 (`react@^18.3.1`, `react-dom@^18.3.1`)
**CSS:** Tailwind CSS v3 (`tailwindcss@^3.4.17`) — v3 was intentionally chosen over v4 for Netlify compatibility
**PostCSS:** `postcss@^8.4.38` + `autoprefixer@^10.4.18`
**Stripe client:** `@stripe/stripe-js@^8.11.0` — loaded lazily via `client/lib/stripe.js`
**Linting:** ESLint + `eslint-config-next@^14.2.3`
**Deployment plugin:** `@netlify/plugin-nextjs@^5.15.9` (SSR, ISR, image optimisation on Netlify)

Key config files:
- `client/next.config.js` — `reactStrictMode: true`; image domains placeholder
- `client/tailwind.config.js` — scans `pages/**`, `components/**`, `styles/**`
- `client/postcss.config.js`
- `client/package.json`

Key source directories:
- `client/pages/` — Next.js Pages Router (marketplace, dashboard, login, register, seller, bot run pages)
- `client/components/` — shared UI (BotCard, CategoryFilter, Navbar, ProtectedRoute, PurchasedBotRoute)
- `client/lib/` — thin helpers (`auth.js` for localStorage JWT, `stripe.js` for lazy Stripe init)

**Auth pattern on the frontend:** JWT stored in `localStorage` under key `gb_token`. `client/lib/auth.js` provides `getToken`, `setToken`, `removeToken`, `authHeaders()`. No third-party auth SDK is used on the client.

---

## Backend API — `server/`

**Framework:** Express 4 (`express@^4.18.2`)
**Entry point:** `server/index.js` → `server/app.js`

**Key server dependencies:**

| Package | Version | Purpose |
|---|---|---|
| `express` | ^4.18.2 | HTTP framework |
| `cors` | ^2.8.5 | Cross-origin headers |
| `dotenv` | ^16.4.5 | Env var loading (dev only) |
| `pg` | ^8.11.3 | PostgreSQL client (`node-postgres`) |
| `stripe` | ^20.4.1 | Stripe server SDK |
| `jsonwebtoken` | ^9.0.2 | JWT sign/verify |
| `bcryptjs` | ^2.4.3 | Password hashing (cost factor 10) |
| `nodemailer` | ^8.0.3 | Transactional email (SMTP) |
| `openai` | ^6.32.0 | OpenAI API client |
| `@anthropic-ai/sdk` | ^0.79.0 | Anthropic (Claude) API client |
| `serverless-http` | ^4.0.0 | Wraps Express for Netlify Functions |

**Dev dependencies:** `jest@^29.7.0`, `nodemon@^3.1.14`, `supertest@^6.3.4`

**Test setup:** Jest with `testEnvironment: node`; test files in `server/__tests__/`; setup file at `server/jest.setup.js`.

**Route structure (mounted in `server/app.js`):**

| Prefix | File | Notes |
|---|---|---|
| `/api/auth` | `routes/auth.js` | register, login |
| `/api/bots` | `routes/bots.js` | CRUD, category/search filtering |
| `/api/payments` | `routes/payments.js` | Stripe checkout, webhook, purchase history |
| `/api/seller` | `routes/seller.js` | seller-specific bot management |
| `/api/deployments` | `routes/deployments.js` | deploy/stop bots |
| `/api/run` | `routes/botRun.js` | proxy prompt to AI |
| `/api/leads` | `routes/leads.js` | AI lead generator |
| `/api/health` | inline | health check |

**Important middleware note:** The Stripe webhook route (`/api/payments/webhook`) is registered with `express.raw({ type: 'application/json' })` *before* `express.json()` to preserve the raw Buffer needed for signature verification.

**Auth middleware:** `server/middleware/auth.js` — expects `Authorization: Bearer <jwt>` header, verifies with `JWT_SECRET`, attaches decoded payload to `req.user`.

---

## Serverless Deployment — `netlify/functions/api.js`

`serverless-http` wraps the Express `app` as a Netlify Function handler. In production, env vars come from the Netlify dashboard; `dotenv` only runs when `NODE_ENV !== 'production'`.

Config file: `netlify.toml`
- Build command installs deps for server + client then runs `next build`
- Publish dir: `client/.next`
- Functions dir: `netlify/functions`
- All `/api/*` requests redirect (status 200, force) to `/.netlify/functions/api/:splat`
- Node version locked to 18

---

## Database — PostgreSQL (Supabase-hosted)

Raw SQL queries via `pg` Pool. No ORM.
Schema file: `database/schema.sql`
Schema runner: `database/run-schema.js`
Seed script: `database/seed.js`

**Tables:** `users`, `bots`, `purchases`, `subscriptions`, `deployments`
**UUID primary keys** via `uuid-ossp` extension
**Triggers:** `set_updated_at()` trigger on `users`, `bots`, `subscriptions`

Database connection is configured entirely through:
```
DATABASE_URL=postgresql://...
```

---

## Environment Variables

All vars live in `C:/globebotter/.env` (root). The server reads them via `dotenv`; the Netlify function loads them from the Netlify dashboard in production.

| Variable | Used by | Purpose |
|---|---|---|
| `PORT` | server | Express listen port (default 5000) |
| `DATABASE_URL` | server | PostgreSQL connection string (Supabase) |
| `JWT_SECRET` | server | JWT signing secret |
| `STRIPE_SECRET_KEY` | server | Stripe server-side API key |
| `STRIPE_WEBHOOK_SECRET` | server | Stripe webhook signature verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | client | Stripe.js public key |
| `CLIENT_URL` | server | Stripe redirect URLs (success/cancel) |
| `GOOGLE_PLACES_API_KEY` | server | Google Places API (lead gen) |
| `OPENAI_API_KEY` | server | OpenAI chat completions |
| `ANTHROPIC_API_KEY` | server | Anthropic Messages API |
| `NEXT_PUBLIC_API_URL` | client | Base URL for API requests from Next.js |
| `EMAIL_HOST` | server | SMTP host |
| `EMAIL_PORT` | server | SMTP port (default 587) |
| `EMAIL_USER` | server | SMTP username |
| `EMAIL_PASS` | server | SMTP password |
| `EMAIL_FROM` | server | "From" address |

---

## Dev Tools & Utilities

- `stripe-cli/stripe.exe` — Stripe CLI binary (Windows) for local webhook forwarding
- `create-webhook.js` — one-shot script to register the Stripe webhook endpoint against the production URL
- `database/run-schema.js` — applies `schema.sql` against the configured `DATABASE_URL`
- `database/seed.js` — seeds 3 flagship bots + admin user
- `server/scripts/updateBotPrices.js` — syncs Stripe price IDs to bot records
- `commit.bat` — Windows batch file for git workflow
