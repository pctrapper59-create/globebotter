# GlobeBotter — Architecture

## Overall Pattern

GlobeBotter is a **monorepo** with a clear client/server split, deployed as a hybrid on Netlify:

- `client/` — Next.js 14 (React 18, Pages Router, Tailwind v3) — rendered as SSR via Netlify's Next.js plugin
- `server/` — Express.js 4 API — wrapped with `serverless-http` and deployed as a Netlify Function
- `database/` — PostgreSQL schema + seed scripts (external hosted DB, e.g. Supabase/Neon via `DATABASE_URL`)
- `netlify/functions/` — the adapter layer that bridges Netlify's Lambda invocation model to the Express app

The entire project is orchestrated from a root `package.json` that installs and builds both workspaces.

---

## Layers

### 1. Presentation Layer (client)
Next.js Pages Router (`client/pages/`). All API calls are client-side fetch calls using `NEXT_PUBLIC_API_URL` as the base. There is no `getServerSideProps` or `getStaticProps` — pages fetch data in `useEffect` hooks.

Authentication state is managed entirely in the browser via `localStorage` (token key `gb_token`). The helper module `client/lib/auth.js` provides `getToken`, `setToken`, `authHeaders`, and `isAuthenticated`.

Route-level access control is handled by two wrapper components:
- `client/components/ProtectedRoute.js` — redirects unauthenticated users to `/login`
- `client/components/PurchasedBotRoute.js` — additionally checks `GET /api/payments/has-access/:botSlug` before rendering a bot tool page

### 2. API Routing Layer (server/app.js + server/routes/)
`server/app.js` is the Express app factory (intentionally separated from `server/index.js` so tests can import it without starting a listener). It mounts seven route modules:

| Route prefix        | File                          | Auth required |
|---------------------|-------------------------------|---------------|
| `/api/auth`         | `server/routes/auth.js`       | No            |
| `/api/bots`         | `server/routes/bots.js`       | Read: No / Write: Yes |
| `/api/payments`     | `server/routes/payments.js`   | Checkout+My: Yes / Webhook: No |
| `/api/seller`       | `server/routes/seller.js`     | Yes           |
| `/api/deployments`  | `server/routes/deployments.js`| Yes           |
| `/api/run`          | `server/routes/botRun.js`     | Yes           |
| `/api/leads`        | `server/routes/leads.js`      | Yes           |

A special case: `/api/payments/webhook` receives raw Buffer bodies (mounted with `express.raw()` BEFORE `express.json()`) for Stripe signature verification.

### 3. Controller Layer (server/controllers/)
One controller per domain. Controllers handle HTTP request/response logic, validation, and orchestrate calls to models, services, and the DB pool. No direct SQL lives in controllers except in `deploymentController.js`, `sellerController.js`, and `botRunController.js` (which do targeted ad-hoc queries).

### 4. Model Layer (server/models/)
Thin SQL wrappers using named query functions. Each model file imports `server/config/db.js` (a `pg.Pool` singleton). Models are plain async functions, not ORM classes.

- `User.js` — `findByEmail`, `findById`, `create`
- `Bot.js` — `findAll` (with optional `category`/`search` filters), `findById` (supports slug or UUID), `create`
- `Purchase.js` — `create`, `findByUser`, `markCompleted`, `userOwnsBot`
- `Subscription.js` — `create`, `findByUser`, `updateStatus`, `userHasActive`

### 5. Service Layer (server/services/)
Cross-cutting concerns isolated as standalone modules:

- `aiService.js` — wraps OpenAI (`gpt-4o-mini` default) and Anthropic (`claude-haiku-4-5-20251001` default); `runBot({ prompt, provider })` routes to the correct provider
- `emailService.js` — nodemailer-based transactional email (welcome, purchase confirmation); silently no-ops when `EMAIL_HOST` is not set

### 6. Config Layer (server/config/)
- `db.js` — exports a single `pg.Pool` connected via `DATABASE_URL`
- `stripe.js` — exports a single `Stripe` instance using `STRIPE_SECRET_KEY`

---

## Data Flow — Typical Request

### Public browse (marketplace)
```
Browser
  → GET /api/bots?category=marketing
  → Netlify CDN redirect (/api/* → /.netlify/functions/api/:splat)
  → netlify/functions/api.js (serverless-http wraps Express)
  → server/app.js → routes/bots.js → controllers/botController.js
  → models/Bot.findAll({ category }) → pg.Pool → PostgreSQL
  → JSON response → client renders BotCard grid
```

### Purchase flow
```
Browser clicks "Buy Now" on /marketplace/[id]
  → POST /api/payments/checkout  { bot_id, mode: 'payment' }
  → paymentController.createCheckout
      → Bot.findById  (get Stripe price IDs)
      → stripe.checkout.sessions.create
      → Purchase.create  (status: 'pending')
      → returns { url: stripeCheckoutUrl }
  → window.location.href = stripeCheckoutUrl
  → User completes payment on Stripe hosted page
  → Stripe sends POST /api/payments/webhook  (raw body)
  → paymentController.handleWebhook
      → stripe.webhooks.constructEvent (signature verification)
      → on checkout.session.completed:
          → Purchase.markCompleted  OR  Subscription.create
          → emailService.sendPurchaseConfirmation  (non-blocking)
  → Stripe redirects browser to /dashboard?success=1
```

### Bot execution flow
```
User on /run/[deploymentId]
  → POST /api/run/:deploymentId  { prompt }
  → authenticate middleware (JWT verification)
  → botRunController.runBot
      → pool.query: validate deployment ownership + active status
      → aiService.runBot({ prompt, provider: 'openai' })
          → OpenAI chat completions API
      → returns { output, model, tokens }
  → client renders bot response in chat UI
```

### Lead generator flow
```
User on /bot/ai-lead-generator (behind PurchasedBotRoute)
  → POST /api/leads/search  { businessType, location, offer, limit }
  → authenticate middleware
  → leadController.searchLeads
      → Google Places Text Search API
      → for each result: Google Places Details API
      → generateMessage(): OpenAI → Anthropic → template fallback
      → returns { leads: [...], total }
  → client renders results table, offers CSV export
```

---

## Deployment Architecture (Netlify)

On Netlify, the build command installs both workspaces then runs `next build` in `client/`. `netlify.toml` configures:

1. **Static/SSR pages** — served by `@netlify/plugin-nextjs` from `client/.next`
2. **API calls** — all `/api/*` routes are redirected (status 200, force) to `/.netlify/functions/api/:splat`
3. **Stripe webhook** — `/api/payments/webhook` has its own redirect entry to ensure raw body preservation

The Netlify Function entry point at `netlify/functions/api.js` loads `server/app.js` and passes it through `serverless-http`, which translates Netlify's Lambda event/context into a standard Express `req`/`res` pair.

---

## Key Environment Variables

| Variable                      | Used by              | Purpose                              |
|-------------------------------|----------------------|--------------------------------------|
| `DATABASE_URL`                | server/config/db.js  | PostgreSQL connection string         |
| `JWT_SECRET`                  | server/middleware/auth.js | JWT signing/verification          |
| `STRIPE_SECRET_KEY`           | server/config/stripe.js  | Stripe API client                 |
| `STRIPE_WEBHOOK_SECRET`       | paymentController.js | Stripe webhook signature verification|
| `OPENAI_API_KEY`              | aiService.js, leadController.js | OpenAI calls              |
| `ANTHROPIC_API_KEY`           | aiService.js, leadController.js | Anthropic calls           |
| `GOOGLE_PLACES_API_KEY`       | leadController.js    | Google Places API                    |
| `EMAIL_HOST/USER/PASS/FROM`   | emailService.js      | SMTP transactional email             |
| `CLIENT_URL`                  | paymentController.js | Stripe success/cancel redirect URLs  |
| `NEXT_PUBLIC_API_URL`         | all client pages     | Base URL for API fetch calls         |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | client/lib/stripe.js | Stripe.js browser client       |
