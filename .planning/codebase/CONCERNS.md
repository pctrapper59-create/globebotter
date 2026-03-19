# GlobeBotter — Technical Debt & Concerns

Generated: 2026-03-18

---

## 1. Incomplete Bot Implementations (Critical Gap)

**Bot #2 (`ai-outreach-bot`) and Bot #3 (`ai-automation-suite`) have no functional pages.**

- `C:/globebotter/client/pages/bot/ai-lead-generator.js` exists and is fully built.
- There is **no** `client/pages/bot/ai-outreach-bot.js` or `client/pages/bot/ai-automation-suite.js`.
- Both bots are sold via Stripe (`price_1TCNf8RMcin8b0U1BJyDqAOI` and `price_1TCNf8RMcin8b0U1APpuj8kC`), so users can pay for them but get nothing.
- `PurchasedBotRoute` would redirect them to `/marketplace/<slug>` with no indication of when the product will be available.
- Homepage `index.js` lists all three products as live, advertising features (e.g. "Send personalized AI-written cold outreach emails at scale") that do not exist in code.

---

## 2. Fake Deployment System in Production

**File:** `C:/globebotter/server/controllers/deploymentController.js`

The `deploy` function uses a `setTimeout(async () => { ... }, 2000)` to simulate a deployment becoming "active". The comment explicitly acknowledges this:

```js
// Simulate async completion — in prod this would be a real job/callback
```

Problems:
- There is no actual infrastructure provisioning. Every "deployed" bot is just a DB row.
- The `setTimeout` fires a DB update with no error handling — if it fails, the deployment stays stuck in `'deploying'` state forever.
- In a serverless (Netlify Functions) environment, the function context may be torn down before the 2-second timeout fires, meaning the deployment **never becomes active** on production.
- No job queue, webhook, or callback mechanism exists to replace this.

---

## 3. Security: No Rate Limiting or Brute-Force Protection

**File:** `C:/globebotter/server/app.js`

The server uses no rate-limiting middleware (no `express-rate-limit`, no `helmet`). This exposes:
- `/api/auth/login` — open to credential-stuffing and brute-force attacks.
- `/api/leads/search` — open to abuse that racks up Google Places API and OpenAI costs with no per-user throttle.
- `/api/run/:deploymentId` — open to token abuse; every call hits an external AI API with no usage cap per user.
- The Stripe webhook at `/api/payments/webhook` is correctly signature-verified, but all other endpoints have no CORS restriction beyond the default open `app.use(cors())`.

---

## 4. Security: CORS Is Fully Open

**File:** `C:/globebotter/server/app.js`, line 21:

```js
app.use(cors());
```

No origin allowlist is configured. Any domain can make cross-origin requests to the API, including sending authenticated requests if a user visits a malicious site with a valid token in localStorage.

---

## 5. Security: Token Stored in localStorage

**File:** `C:/globebotter/client/lib/auth.js`

JWTs are stored in `localStorage` under the key `gb_token`. This is vulnerable to XSS. If any injected script runs in the browser, it can exfiltrate the token. The safer alternative is `HttpOnly` cookies, which JavaScript cannot read.

---

## 6. Security: PurchasedBotRoute Fails Open on Network Error

**File:** `C:/globebotter/client/components/PurchasedBotRoute.js`, lines 43–46:

```js
.catch(() => {
  // On network error, fail open so legitimate users aren't locked out
  setStatus('granted');
});
```

If the `/api/payments/has-access/:bot_id` request fails for any reason (network blip, server error, API rate limit), the component grants access unconditionally. This is a deliberate trade-off in the comment, but it means a determined user could trigger a network error (e.g. by blocking the request) and bypass the purchase gate entirely for bot pages.

---

## 7. Security: No Input Validation on Password Strength or Email Format

**File:** `C:/globebotter/server/controllers/authController.js`

The `register` endpoint only checks that `name`, `email`, and `password` are truthy — no minimum length, complexity, or email format validation. A user can register with `password: "a"` or `email: "x"`. No server-side email format check is enforced.

---

## 8. Schema Drift: `pricing_model` and `slug` Columns Are Not in `schema.sql`

**Files:**
- `C:/globebotter/database/schema.sql` — canonical schema
- `C:/globebotter/server/scripts/updateBotPrices.js` — adds `pricing_model`, `stripe_price_id_once`, `stripe_price_id_monthly` via `ALTER TABLE`
- `C:/globebotter/database/seed.js` — adds `slug` column via `ALTER TABLE ADD COLUMN IF NOT EXISTS`

The official schema does not include `slug` or `pricing_model`. These columns only exist because one-off scripts are run manually after the schema is applied. A fresh database created from `schema.sql` alone will be missing these columns. The `marketplace/[id].js` page reads `bot.pricing_model` and will default to `'both'` silently, but the lead bot's `PurchasedBotRoute` looks up by `slug` and will break.

---

## 9. Duplicate Stripe Price IDs Between Scripts

**Files:**
- `C:/globebotter/database/seed.js` — hard-codes one set of `stripe_price_id_once` / `stripe_price_id_monthly` values
- `C:/globebotter/server/scripts/updateBotPrices.js` — hard-codes a **different** set of IDs for the same bots

For example, `ai-lead-generator`:
- `seed.js`: `price_1TCMX6EjDlkmOvOiZq8zxggV`
- `updateBotPrices.js`: `price_1TCNf8RMcin8b0U1Z2bUcm2k`

If both scripts are run in sequence, `updateBotPrices.js` overwrites the seed values. If only `seed.js` is run, the wrong Stripe price IDs are used. The correct set is ambiguous from the codebase alone.

---

## 10. No Pagination on Bot Listings or Deployments

**Files:**
- `C:/globebotter/server/models/Bot.js` — `findAll` returns all rows with `SELECT * FROM bots ... ORDER BY created_at DESC`
- `C:/globebotter/server/controllers/deploymentController.js` — `getDeployments` returns all deployments for a user

As the marketplace grows, these queries will return unbounded result sets. With hundreds or thousands of bots, this will cause slow page loads and high memory pressure on both the server and the client.

---

## 11. No Error Handling in `fetchAll` on the Dashboard

**File:** `C:/globebotter/client/pages/dashboard.js`, lines 58–67:

The `fetchAll` function uses `await Promise.all(...)` and `await Promise.all([paymentsRes.json(), deploymentsRes.json()])` with no `try/catch`. Any network error or non-JSON response will throw an unhandled promise rejection, silently leaving the dashboard blank with no user-facing error state.

---

## 12. No Error Handling in `fetchAll` on the Seller Dashboard

**File:** `C:/globebotter/client/pages/seller.js`, line 103:

Same pattern — `fetchAll` calls three parallel API endpoints with no `try/catch`. Errors are silently swallowed.

---

## 13. Google Places API Calls Are Sequential, Not Parallel

**File:** `C:/globebotter/server/controllers/leadController.js`, lines 144–162:

The `for` loop over `places` calls `fetchPlaceDetails` and `generateMessage` sequentially with `await` inside the loop. For a request of 20 leads, this means up to 40 sequential HTTP calls (20 Places detail fetches + 20 AI message generations). This is the primary reason the UI warns "This usually takes 15–30 seconds". Converting to `Promise.all` would dramatically reduce latency.

---

## 14. AI Provider Hardcoded to OpenAI in Bot Run

**File:** `C:/globebotter/server/controllers/botRunController.js`, line 49:

```js
const aiResult = await aiService.runBot({ prompt: prompt.trim(), provider: 'openai' });
```

The `provider` is hardcoded to `'openai'`. The `aiService` supports Anthropic as well, but there is no way for a bot configuration or user to select it. The `Anthropic` code path in `aiService.js` is effectively dead in production.

---

## 15. Anthropic Model ID Appears Non-Standard

**File:** `C:/globebotter/server/services/aiService.js`, line 17:

```js
const ANTHROPIC_DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
```

As of the knowledge cutoff, the canonical Anthropic model ID for Claude Haiku is `claude-haiku-20240307` (also used in `leadController.js`). The string `claude-haiku-4-5-20251001` is not a known valid model ID and will cause API errors if the Anthropic path is ever invoked via `runBot`.

---

## 16. No Seller Role Enforcement

**Files:**
- `C:/globebotter/server/routes/seller.js` — applies `authenticate` middleware only
- `C:/globebotter/server/controllers/sellerController.js` — no role check

Any authenticated user (including buyers with `role: 'buyer'`) can POST to `/api/seller/bots` and create marketplace listings. The `role` column exists on the `users` table and has a `CHECK (role IN ('buyer', 'seller', 'admin'))` constraint, but it is never checked in the seller routes.

---

## 17. `VALID_CATEGORIES` in botController Is Not Enforced

**File:** `C:/globebotter/server/controllers/botController.js`, line 7:

```js
const VALID_CATEGORIES = ['trading', 'marketing', 'social_media', 'custom'];
```

This array is declared but never used in validation. The `createBot` handler accepts any string in `category`. The database `CHECK` constraint would reject invalid values, but the error bubbles up as an unhandled 500 rather than a clean 400 with a useful message.

---

## 18. `stripe_customer_id` Is Never Populated

**File:** `C:/globebotter/database/schema.sql`, line 18:

The `users` table has a `stripe_customer_id VARCHAR(255)` column. No code anywhere sets this field. Stripe recommends storing a customer ID to link subscriptions and manage payment methods. Without it, the system cannot support subscription cancellation, invoice history, or payment method updates initiated from within the app.

---

## 19. No Subscription Cancellation Endpoint

The `subscriptions` table has a `canceled_at` column and `Subscription.updateStatus` supports setting it, but there is no API route or UI surface for a user to cancel their own subscription. Cancellation would have to go through the Stripe dashboard directly. The subscription row would eventually be updated via the `customer.subscription.deleted` webhook.

---

## 20. Hero Stats Are Hardcoded Marketing Copy

**File:** `C:/globebotter/client/pages/index.js`, lines 161–166:

```js
<span className={styles.statNum}>500+</span><span className={styles.statLabel}>Bots</span>
<span className={styles.statNum}>10K+</span><span className={styles.statLabel}>Users</span>
<span className={styles.statNum}>99.9%</span><span className={styles.statLabel}>Uptime</span>
```

These are fabricated figures on a platform that currently has 3 seeded bots and no live users. This creates false advertising risk and will need to be replaced with real dynamic data or removed before public launch.

---

## 21. No `.env` Validation at Startup

**File:** `C:/globebotter/server/index.js`

The server starts without validating that required environment variables (`JWT_SECRET`, `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) are set. Missing any of these will cause silent failures or confusing runtime errors rather than a clear startup error.

---

## 22. `netlify.toml` Webhook Redirect May Conflict

**File:** `C:/globebotter/netlify.toml`

Two redirect rules match the same webhook path:
- Rule 1: `from = "/api/*"` catches all API routes including `/api/payments/webhook`
- Rule 2: `from = "/api/payments/webhook"` is a more specific rule listed **after** the wildcard

Netlify processes redirects in order. The wildcard rule would match first, and the specific webhook rule would never trigger. If Netlify's behavior changes between deploys, the webhook could stop working silently.

---

## 23. No Tests for Payment, Lead, Seller, or Deployment Controllers

**Files under `C:/globebotter/server/__tests__/`:**
- `auth.test.js` — covered
- `bots.test.js` — covered
- `botRun.test.js` — covered
- `emailService.test.js` — covered
- **Missing:** `paymentController`, `leadController`, `sellerController`, `deploymentController`

The Stripe checkout flow, webhook handling, access-control logic, and Google Places integration have zero automated test coverage.

---

## 24. `create-webhook.js` at Repo Root Is Stray Tooling

**File:** `C:/globebotter/create-webhook.js`

This file sits at the root of the repo (not tracked by git per `.gitignore` if present, but currently untracked per git status). It is development scaffolding that should either be moved to a `scripts/` directory or explicitly excluded.

---

## 25. No Idempotency Check in Stripe Webhook for Purchases

**File:** `C:/globebotter/server/controllers/paymentController.js`, line 101:

```js
await Purchase.markCompleted(session.id);
```

Stripe may deliver the same `checkout.session.completed` event more than once (guaranteed-delivery semantics). The `markCompleted` call is an UPDATE by `stripe_session_id`, so re-processing is harmless for purchases. However, for subscriptions (lines 106–113), `Subscription.create` is called unconditionally on every delivery of the event, and the `UNIQUE` constraint on `(user_id, bot_id) WHERE status IN ('active', 'trialing')` is the only guard — this will throw a DB constraint error on replay, which propagates as a 500 to Stripe and causes unnecessary retries.
