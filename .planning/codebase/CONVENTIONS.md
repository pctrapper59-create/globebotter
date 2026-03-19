# Codebase Conventions

## Module System

The codebase uses **two distinct module systems** that must not be mixed:

- **Server** (`/server`): CommonJS exclusively. Every file uses `require()` / `module.exports`. This includes all controllers, models, routes, services, config, and middleware. Example: `server/app.js`, `server/controllers/authController.js`.
- **Client** (`/client`): ES Modules exclusively. Every file uses `import` / `export default` / named exports. This is enforced by Next.js's Babel/SWC pipeline. Example: `client/lib/auth.js`, `client/components/BotCard.js`.

There is no intermingling. The `next.config.js` file uses CommonJS (`module.exports`) because it runs in the Next.js Node.js config layer, not in the browser/client bundle.

## Async/Await Patterns

All asynchronous operations use `async/await` throughout, never raw `.then()` chains for primary control flow. The only exceptions are intentional fire-and-forget patterns where `.catch(() => {})` is used to suppress errors on non-critical background calls:

- `server/controllers/authController.js`: `emailService.sendWelcomeEmail(...).catch(() => {})` — non-blocking welcome email after registration.
- `server/controllers/paymentController.js`: `Promise.all([...]).then(...).catch(() => {})` — purchase confirmation email inside a Stripe webhook where failure must never break the webhook response.

`Promise.all()` is used consistently for parallel independent async operations (e.g., in `paymentController.js` `getMyPurchases`, `deploymentController.js` `deploy`).

## Error Handling Patterns

### Server (Express)
All controller functions follow a uniform try/catch pattern:
1. Validate inputs early — return `400` with a descriptive `{ error: '...' }` JSON body.
2. Check resource existence — return `404` with `{ error: 'Resource not found' }`.
3. Check authorization — return `401` (no token) or `403` (wrong owner / insufficient access).
4. On unexpected errors — `console.error('handlerName error:', err)` then `res.status(500).json({ error: 'Server error' })`.

Error messages from validators are specific and testable (e.g., `'name, description, price, and category are required'`). The `500` fallback intentionally uses a generic message to avoid leaking internals.

Stripe webhook error handling has a two-level try/catch: the outer catches signature verification failures (returns `400`), the inner catches processing failures (returns `500`).

### Client (Next.js)
All page-level fetch calls use try/catch inside async functions. The pattern is:
1. Set `loading = true`, clear `error`.
2. Try the fetch; on non-ok response use `data.error || 'fallback message'`.
3. Catch network errors with a generic "Network error — please try again." message.
4. `finally` block always clears `loading`.

See `client/pages/login.js`, `client/pages/marketplace.js`, `client/pages/bot/ai-lead-generator.js`.

## Naming Conventions

### Files
- **Server**: `camelCase` for all JS files — `authController.js`, `botRunController.js`, `emailService.js`.
- **Client**: `PascalCase` for React component files — `BotCard.js`, `ProtectedRoute.js`, `CategoryFilter.js`. `camelCase` for utility/lib files — `auth.js`, `stripe.js`.
- **CSS Modules**: `camelCase` matching the component or page name — `marketplace.module.css`, `navbar.module.css`, `auth.module.css`.

### Variables and Functions
- **Server controllers**: exported as named `const` functions in camelCase — `getBots`, `createBot`, `handleWebhook`.
- **Server models**: exported as plain function objects — `findAll`, `findById`, `create`, `markCompleted`.
- **Client components**: `export default function PascalCase()` for the primary export. Internal sub-components are also PascalCase and defined in the same file (e.g., `DeploymentRow` in `dashboard.js`, `LeadRow` in `ai-lead-generator.js`).
- **Database column names**: `snake_case` matching PostgreSQL convention — `user_id`, `bot_id`, `creator_id`, `stripe_session_id`.
- **React state variables**: paired as `[noun, setNoun]` in camelCase — `[bots, setBots]`, `[loading, setLoading]`, `[error, setError]`.

### Constants
- Uppercase `SCREAMING_SNAKE_CASE` for module-level constants — `VALID_CATEGORIES`, `TOKEN_KEY`, `OPENAI_DEFAULT_MODEL`, `ANTHROPIC_DEFAULT_MODEL`, `PLACES_BASE`, `API`, `SORT_OPTIONS`.

## JSDoc Usage

JSDoc is used selectively and consistently — not on every function, but always on:
1. **Service functions** with non-obvious signatures: `server/services/aiService.js` documents all three exported functions with `@param` and `@returns` tags.
2. **Service-layer email functions**: `server/services/emailService.js` documents `sendWelcomeEmail` and `sendPurchaseConfirmation` with `@param` and `@returns`.
3. **File-level doc comments**: Every server-side file has a top-of-file JSDoc block describing purpose, exported functions, HTTP routes it handles, and relevant env vars required.
4. **Client components**: Leading JSDoc comment naming the component, its props, and usage notes (e.g., `BotCard.js`, `ProtectedRoute.js`).

Controller functions themselves are not individually JSDoc'd — the file-level comment covers their purpose and the try/catch pattern makes behavior self-evident.

## Component Structure Patterns (Client)

Pages follow a consistent split-component pattern:
- The **default export** is a thin wrapper that applies route guards (e.g., `<ProtectedRoute>`, `<PurchasedBotRoute>`).
- The **content component** (`DashboardContent`, `LeadBotContent`) contains all state and render logic and is not exported.
- Helper sub-components (`DeploymentRow`, `LeadRow`, `CopyButton`) are defined as plain functions in the same file above their consumer. They are not separately exported.

Utility functions that do not use hooks (e.g., `sortBots` in `marketplace.js`, `exportCSV` and `templateMessage` in `ai-lead-generator.js`) are extracted above the component and defined as plain functions.

Route guards are implemented as wrapper components:
- `client/components/ProtectedRoute.js` — redirects to `/login` if no token in `localStorage`.
- `client/components/PurchasedBotRoute.js` — additionally checks API for bot ownership before rendering.

## CSS Modules Usage

The client uses a hybrid approach:
- **CSS Modules** are the primary styling mechanism. Every page and most components have a co-located `styles/*.module.css` file. Classes are accessed via `styles.className` in JSX.
- **Tailwind CSS** is imported globally in `client/styles/globals.css` via `@tailwind base/components/utilities` but is largely unused in component JSX (Tailwind classes do not appear in component files reviewed). The project uses Tailwind v3 (pure JS, no native bindings) for Netlify build compatibility per commit history.
- **CSS custom properties** are defined on `:root` in `globals.css` for the design system (colors: `--green`, `--blue`, `--bg-base`, etc.) and are referenced via `var(--green)` directly in component CSS modules and inline styles.
- Inline styles are used sparingly and only for dynamic values that cannot be expressed in a static CSS class (e.g., badge background color computed from a category map in `BotCard.js`).

## Environment Variable Access

- Server: all env vars accessed via `process.env.*` at call time (not at module load), except `config/db.js` and `config/stripe.js` which access them once at module initialization.
- Client: only `NEXT_PUBLIC_API_URL` is used, stored as `const API = process.env.NEXT_PUBLIC_API_URL` at the top of each page that calls the API.
- `server/services/aiService.js` uses lazy `require()` for `openai` and `@anthropic-ai/sdk` packages so they can be mocked in tests without being installed.
