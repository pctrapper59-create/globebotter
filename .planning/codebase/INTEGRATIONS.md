# GlobeBotter — External Integrations

## 1. Stripe

**Purpose:** Payments — one-time purchases and recurring monthly subscriptions for AI bots.

**SDK versions:**
- Server: `stripe@^20.4.1` (`server/node_modules`)
- Client: `@stripe/stripe-js@^8.11.0` (Stripe.js, browser-side)

**Configuration files:**
- `server/config/stripe.js` — creates a single shared Stripe client instance: `new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })`
- `client/lib/stripe.js` — lazy-loads Stripe.js with `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Environment variables:**
- `STRIPE_SECRET_KEY` — server-side API key (test: `sk_test_51TCMMREj...`)
- `STRIPE_WEBHOOK_SECRET` — webhook signing secret (`whsec_...`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — browser-side publishable key (`pk_test_51TCMMREj...`)

**Flows implemented (in `server/controllers/paymentController.js`):**

1. **Checkout session creation** (`POST /api/payments/checkout`)
   - Accepts `bot_id` and `mode` (`'payment'` | `'subscription'`)
   - Uses pre-configured `stripe_price_id_once` or `stripe_price_id_monthly` from the `bots` table if present; otherwise falls back to inline `price_data`
   - Sets `success_url` to `${CLIENT_URL}/dashboard?success=1&bot_id=...` and `cancel_url` to `${CLIENT_URL}/marketplace/${bot_id}?canceled=1`
   - Embeds `user_id`, `bot_id`, `mode` in `metadata` for webhook correlation

2. **Stripe webhook handler** (`POST /api/payments/webhook`)
   - Raw body preserved via `express.raw()` before `express.json()` (see `server/app.js`)
   - Events handled:
     - `checkout.session.completed` — marks purchase completed OR creates subscription record; triggers purchase confirmation email
     - `customer.subscription.updated` — updates subscription status, period dates
     - `customer.subscription.deleted` — sets subscription status to canceled
   - Webhook endpoint URL: `https://globebotter.com/api/payments/webhook`
   - Netlify redirect rule in `netlify.toml` routes this specifically to ensure raw body passthrough

3. **Stripe Price IDs** (seeded in `database/seed.js`):
   - AI Automation Suite monthly: `price_1TCMgvEjDlkmOvOijQz2rvUZ`
   - AI Lead Generator one-time: `price_1TCMX6EjDlkmOvOiZq8zxggV`
   - AI Outreach Bot one-time: `price_1TCMdaEjDlkmOvOiCaRuiBl6`

**Webhook creation utility:** `create-webhook.js` registers the endpoint with events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `payment_intent.succeeded`, `payment_intent.payment_failed`.

**Database tables involved:** `purchases` (stores `stripe_session_id`, `stripe_payment_intent_id`), `subscriptions` (stores `stripe_subscription_id`, `stripe_price_id`), `users` (stores `stripe_customer_id`), `bots` (stores `stripe_product_id`, `stripe_price_id_once`, `stripe_price_id_monthly`).

---

## 2. OpenAI

**Purpose:** Two distinct usages — general bot execution and lead outreach message generation.

**SDK:** `openai@^6.32.0` (lazy-required at call time to support test mocking)

**Environment variable:** `OPENAI_API_KEY`

**Usage 1 — Bot runner** (`server/services/aiService.js`):
- Function: `runWithOpenAI({ prompt, model })`
- Default model: `gpt-4o-mini`
- API call: `client.chat.completions.create({ model, messages: [{ role: 'user', content: prompt }] })`
- Returns `{ output, model, tokens }` where `tokens` = `response.usage.total_tokens`
- Called from `server/controllers/botRunController.js` (`POST /api/run/:deploymentId`) with `provider: 'openai'`

**Usage 2 — Lead message generation** (`server/controllers/leadController.js`):
- Direct `fetch` call to `https://api.openai.com/v1/chat/completions` (not the SDK)
- Model: `gpt-3.5-turbo`, `max_tokens: 150`, `temperature: 0.8`
- System prompt: "You write punchy, personalized cold outreach messages for local businesses."
- Falls back to Anthropic, then to deterministic template messages if unavailable

---

## 3. Anthropic (Claude)

**Purpose:** Alternative AI provider for bot execution and lead message generation.

**SDK:** `@anthropic-ai/sdk@^0.79.0` (lazy-required at call time)

**Environment variable:** `ANTHROPIC_API_KEY`

**Usage 1 — Bot runner** (`server/services/aiService.js`):
- Function: `runWithAnthropic({ prompt, model })`
- Default model: `claude-haiku-4-5-20251001`
- API call: `client.messages.create({ model, max_tokens: 1024, messages: [...] })`
- Returns `{ output, model, tokens }` where `tokens` = `input_tokens + output_tokens`
- Invoked when `provider: 'anthropic'` is passed to `runBot()`

**Usage 2 — Lead message generation** (`server/controllers/leadController.js`):
- Direct `fetch` call to `https://api.anthropic.com/v1/messages`
- Headers: `x-api-key`, `anthropic-version: 2023-06-01`
- Model: `claude-haiku-20240307`, `max_tokens: 150`
- Secondary fallback after OpenAI attempt

**Provider routing logic** (in `aiService.js`): `runBot({ prompt, provider })` routes to `runWithAnthropic` when `provider === 'anthropic'`, otherwise defaults to `runWithOpenAI`.

---

## 4. Google Places API

**Purpose:** Lead generation — search for local businesses by type and location, then enrich with contact details.

**Integration type:** Direct HTTP fetch (no SDK)
**Base URL:** `https://maps.googleapis.com/maps/api/place`
**Environment variable:** `GOOGLE_PLACES_API_KEY`

**Endpoints called** (in `server/controllers/leadController.js`):

1. **Text Search** — `GET /textsearch/json?query=<businessType+in+location>&key=<apiKey>`
   - Returns up to 20 places (capped by `limit` param, max 20)
   - Used to find candidate businesses

2. **Place Details** — `GET /details/json?place_id=<id>&fields=name,website,formatted_phone_number,formatted_address&key=<apiKey>`
   - Called per-place to enrich with website, phone, and full address

**Route:** `POST /api/leads/search` — body: `{ businessType, location, offer, limit }`
**Response:** `{ leads: [{ name, address, website, phone, message }], total }`

---

## 5. Supabase (PostgreSQL)

**Purpose:** Hosted PostgreSQL database — the only persistent datastore.

**Connection:** Standard `pg` Pool via `DATABASE_URL` connection string (format: `postgresql://user:pass@aws-0-us-west-2.pooler.supabase.com:5432/postgres`).
**SSL:** `rejectUnauthorized: false` in seed and schema runner scripts.
**Configuration:** `server/config/db.js`

Supabase is used purely as a managed PostgreSQL host. No Supabase client library (`@supabase/supabase-js`) is used — all queries are raw SQL via `node-postgres`.

**Schema:** Applied via `database/schema.sql`; uses `uuid-ossp` extension for UUID primary keys.

---

## 6. SMTP / Email Service (Nodemailer)

**Purpose:** Transactional emails — welcome on registration, purchase confirmation after Stripe checkout.

**Library:** `nodemailer@^8.0.3`
**Implementation:** `server/services/emailService.js`

**Environment variables:**

| Variable | Default | Purpose |
|---|---|---|
| `EMAIL_HOST` | — | SMTP host; service disabled if not set |
| `EMAIL_PORT` | 587 | SMTP port |
| `EMAIL_USER` | — | SMTP username |
| `EMAIL_PASS` | — | SMTP password |
| `EMAIL_FROM` | `GlobeBotter <noreply@globebotter.com>` | From address |

**Graceful degradation:** If `EMAIL_HOST` is not set, all send functions return `{ sent: false, reason: 'not configured' }` without throwing. Email sends are always fire-and-forget (`.catch(() => {})`) so they never block register or webhook responses.

**Emails sent:**
- `sendWelcomeEmail({ name, email })` — triggered in `authController.register`
- `sendPurchaseConfirmation({ email, name, botName, amount })` — triggered in `paymentController.handleWebhook` on `checkout.session.completed`

---

## 7. Auth System (Custom JWT — no third-party provider)

There is no Auth0, Clerk, NextAuth, or Supabase Auth. Authentication is fully custom:

**Server:**
- Passwords hashed with `bcryptjs` (cost 10) before storage in `users.password`
- On login/register, a JWT is signed with `JWT_SECRET`, expires in 7 days
- `server/middleware/auth.js` verifies `Authorization: Bearer <token>` on protected routes

**Client:**
- Token stored in `localStorage` (key: `gb_token`) via `client/lib/auth.js`
- `ProtectedRoute` component (`client/components/ProtectedRoute.js`) gates authenticated pages
- `PurchasedBotRoute` (`client/components/PurchasedBotRoute.js`) additionally checks bot access via `GET /api/payments/has-access/:bot_id`

---

## 8. Netlify (Hosting & Serverless Functions)

**Purpose:** Full-stack deployment — Next.js frontend + Express backend as serverless functions.

**Plugin:** `@netlify/plugin-nextjs@^5.15.9`
**Functions runtime:** `serverless-http@^4.0.0` wraps the Express app in `netlify/functions/api.js`
**Routing:** `netlify.toml` redirects all `/api/*` to `/.netlify/functions/api/:splat` at status 200

In production, all environment variables are set via the Netlify dashboard (Site Settings > Environment Variables), not `.env`.

---

## Integration Dependency Map

```
Client (Next.js)
  └── Stripe.js (browser)          ← NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

Netlify Function (serverless-http)
  └── Express App
        ├── /api/auth              ← bcryptjs, jsonwebtoken, nodemailer
        ├── /api/payments          ← Stripe SDK, nodemailer (post-webhook)
        ├── /api/run               ← aiService → OpenAI SDK or Anthropic SDK
        ├── /api/leads             ← Google Places API (fetch), OpenAI/Anthropic (fetch)
        └── all routes             ← pg Pool → Supabase PostgreSQL
```
