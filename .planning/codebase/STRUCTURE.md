# GlobeBotter — Directory Structure

## Top-Level Layout

```
C:/globebotter/
├── client/              Next.js 14 frontend (Pages Router)
├── server/              Express.js API backend
├── database/            PostgreSQL schema and seed scripts
├── netlify/             Netlify Function adapter
├── netlify.toml         Netlify build + redirect configuration
├── package.json         Root workspace: build scripts, shared deps (serverless-http, stripe-js)
├── .planning/           Planning and documentation (this directory)
├── logo.png             Brand logo asset (also served from client/public/images/)
├── Ai_lead.png          Product screenshot — AI Lead Generator
├── Ai_outreach.png      Product screenshot — AI Outreach Bot
├── ai_automation suite.png  Product screenshot — AI Automation Suite
├── DEPLOY.md            Deployment notes
└── README.md            Project overview
```

---

## `client/` — Next.js Frontend

```
client/
├── pages/               Route pages (file-based routing via Next.js Pages Router)
│   ├── _app.js          App shell — imports globals.css, no additional providers
│   ├── index.js         Homepage: hero, featured bots, category nav, CTA strip
│   ├── marketplace.js   Public bot listing: search, filter, sort
│   ├── login.js         Auth: email/password login, returns JWT
│   ├── register.js      Auth: new user registration
│   ├── dashboard.js     Buyer dashboard: My Bots, Subscriptions, Deployments tabs
│   ├── seller.js        Seller dashboard: upload bot, view sales & stats
│   ├── marketplace/
│   │   └── [id].js      Bot detail page: description, features, Buy/Subscribe CTAs
│   ├── bot/
│   │   └── ai-lead-generator.js  Lead Generator bot UI (behind PurchasedBotRoute)
│   └── run/
│       └── [id].js      Bot chat interface for active deployments (behind ProtectedRoute)
│
├── components/          Shared React components
│   ├── Navbar.js        Site-wide navigation bar with logo, links, auth CTAs
│   ├── BotCard.js       Marketplace grid card — name, category, price, description
│   ├── CategoryFilter.js  Category pill filter used on marketplace page
│   ├── ProtectedRoute.js  HOC: redirects to /login if no JWT in localStorage
│   └── PurchasedBotRoute.js  HOC: checks purchase/subscription access via API
│
├── lib/                 Client-side utility modules
│   ├── auth.js          JWT token helpers: getToken, setToken, authHeaders, logout
│   └── stripe.js        Lazy-loads @stripe/stripe-js for browser-only use
│
├── styles/              CSS Modules — one file per page/component
│   ├── globals.css      Global resets and CSS custom properties (--green, --blue, etc.)
│   ├── home.module.css
│   ├── marketplace.module.css
│   ├── botDetail.module.css
│   ├── dashboard.module.css
│   ├── seller.module.css
│   ├── auth.module.css
│   ├── run.module.css
│   ├── leadBot.module.css
│   └── navbar.module.css
│
├── public/              Static assets served at /
│   └── images/          Bot product images, logo
│
├── next.config.js       Next.js config: reactStrictMode, image domains
├── tailwind.config.js   Tailwind v3 config
├── postcss.config.js    PostCSS for Tailwind
└── package.json         Client dependencies (Next 14, React 18, Tailwind 3)
```

### Client Naming Conventions
- Pages use **camelCase** for flat routes (`dashboard.js`, `seller.js`) and **bracket notation** for dynamic segments (`[id].js`)
- Components use **PascalCase** (`Navbar.js`, `BotCard.js`, `ProtectedRoute.js`)
- CSS Modules follow `<pageName>.module.css` pattern, co-located in `styles/`
- The `lib/` directory holds non-UI helpers (no JSX)

---

## `server/` — Express API Backend

```
server/
├── index.js             Entry point: loads .env, calls app.listen(PORT || 5000)
├── app.js               Express app factory: middleware, route mounting (imported by tests and Netlify function)
│
├── routes/              Route definitions — thin, delegate to controllers
│   ├── auth.js          POST /api/auth/register, POST /api/auth/login
│   ├── bots.js          GET /api/bots, GET /api/bots/:id, POST /api/bots
│   ├── payments.js      POST /api/payments/checkout, POST /api/payments/webhook,
│   │                    GET /api/payments/my, GET /api/payments/has-access/:bot_id
│   ├── seller.js        GET/POST /api/seller/bots, GET /api/seller/sales, GET /api/seller/stats
│   ├── deployments.js   POST /api/deployments, GET /api/deployments, PATCH /api/deployments/:id/stop
│   ├── botRun.js        POST /api/run/:deploymentId
│   └── leads.js         POST /api/leads/search
│
├── controllers/         Request handlers — validation, orchestration, response
│   ├── authController.js       register (bcrypt hash + JWT) and login
│   ├── botController.js        getBots, getBot, createBot
│   ├── paymentController.js    createCheckout, handleWebhook, getMyPurchases, hasAccess
│   ├── sellerController.js     getMyBots, uploadBot, getSales, getStats
│   ├── deploymentController.js deploy, getDeployments, stopDeployment
│   ├── botRunController.js     runBot (validates deployment, calls aiService)
│   └── leadController.js       searchLeads (Google Places + AI message generation)
│
├── models/              SQL query functions — one file per DB table
│   ├── User.js          findByEmail, findById, create
│   ├── Bot.js           findAll (category/search filters), findById (slug or UUID), create
│   ├── Purchase.js      create, findByUser, markCompleted, userOwnsBot
│   └── Subscription.js  create, findByUser, updateStatus, userHasActive
│
├── middleware/          Express middleware
│   └── auth.js          JWT authenticate: reads Authorization: Bearer <token>, sets req.user
│
├── services/            External integrations and cross-cutting logic
│   ├── aiService.js     runBot({ prompt, provider }): OpenAI and Anthropic wrappers
│   └── emailService.js  sendWelcomeEmail, sendPurchaseConfirmation (nodemailer, silently skips if unconfigured)
│
├── config/              Singleton clients
│   ├── db.js            pg.Pool connected via DATABASE_URL
│   └── stripe.js        Stripe instance using STRIPE_SECRET_KEY
│
├── scripts/             One-off admin scripts
│   └── updateBotPrices.js  Syncs bot prices to Stripe product/price IDs
│
├── __tests__/           Jest integration tests (supertest)
│   ├── auth.test.js
│   ├── bots.test.js
│   ├── botRun.test.js
│   └── emailService.test.js
│
├── jest.setup.js        Jest environment setup
└── package.json         Server deps: express, pg, stripe, jsonwebtoken, bcryptjs, openai, @anthropic-ai/sdk, nodemailer
```

### Server Naming Conventions
- Routes: **camelCase** matching domain (`botRun.js`, `payments.js`)
- Controllers: **camelCase + Controller suffix** (`authController.js`)
- Models: **PascalCase** matching table entity (`User.js`, `Bot.js`)
- All modules use CommonJS (`require`/`module.exports`)

---

## `database/` — Schema and Seed

```
database/
├── schema.sql           Full PostgreSQL DDL: users, bots, purchases, subscriptions, deployments tables
│                        Includes uuid-ossp extension, indexes, unique constraints, and auto-updated_at trigger
├── seed.js              Seeds 3 flagship bots (AI Automation Suite, AI Lead Generator, AI Outreach Bot)
└── run-schema.js        Node script to run schema.sql against the configured DATABASE_URL
```

### Database Tables
| Table           | Primary Key | Key Relations                        |
|-----------------|-------------|--------------------------------------|
| `users`         | UUID        | Referenced by bots, purchases, subscriptions, deployments |
| `bots`          | UUID        | `creator_id → users.id`              |
| `purchases`     | UUID        | `user_id → users`, `bot_id → bots`   |
| `subscriptions` | UUID        | `user_id → users`, `bot_id → bots`   |
| `deployments`   | UUID        | `user_id → users`, `bot_id → bots`   |

---

## `netlify/` — Serverless Adapter

```
netlify/
└── functions/
    └── api.js           Exports handler = serverless(app): wraps server/app.js for Netlify Lambda
```

`netlify/functions/api.js` is the single Netlify Function. It imports `server/app.js` directly and wraps it with `serverless-http`. The `netlify.toml` redirect rule sends all `/api/*` traffic here.

---

## Key File Locations (Quick Reference)

| Purpose                         | Path                                              |
|---------------------------------|---------------------------------------------------|
| Express app factory             | `server/app.js`                                   |
| Netlify function entry          | `netlify/functions/api.js`                        |
| JWT middleware                  | `server/middleware/auth.js`                       |
| Database pool                   | `server/config/db.js`                             |
| Stripe singleton                | `server/config/stripe.js`                         |
| AI provider abstraction         | `server/services/aiService.js`                    |
| Email service                   | `server/services/emailService.js`                 |
| Client auth helpers             | `client/lib/auth.js`                              |
| Client Stripe loader            | `client/lib/stripe.js`                            |
| Route guard (auth only)         | `client/components/ProtectedRoute.js`             |
| Route guard (auth + purchase)   | `client/components/PurchasedBotRoute.js`          |
| Homepage                        | `client/pages/index.js`                           |
| Marketplace listing             | `client/pages/marketplace.js`                     |
| Bot detail + purchase           | `client/pages/marketplace/[id].js`                |
| AI Lead Generator UI            | `client/pages/bot/ai-lead-generator.js`           |
| Bot chat run UI                 | `client/pages/run/[id].js`                        |
| PostgreSQL schema                | `database/schema.sql`                             |
| Netlify build config            | `netlify.toml`                                    |
