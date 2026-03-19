# Testing

## Test Framework

**Jest 29** is the sole test framework. It is configured in `server/package.json` and only covers the server. There is no test setup for the client (Next.js) side.

Dependencies:
- `jest@^29.7.0` — test runner
- `supertest@^6.3.4` — HTTP integration testing against Express apps

No additional assertion libraries beyond Jest's built-in `expect` are used. No snapshot testing is used.

## Running Tests

From the repository root:
```
npm test
```
This runs `cd server && npm test`, which executes `jest --runInBand --forceExit`.

From the server directory directly:
```
cd server && npm test
```

`--runInBand` runs tests serially (not in parallel workers) — important because tests share mocked module state via `jest.mock()`. `--forceExit` ensures Jest exits even if a pending async operation or open handle would otherwise keep the process alive (relevant since the Stripe config initializes at module load time).

## Test File Locations

All test files are located in `server/__tests__/` and follow the naming pattern `*.test.js`:

- `server/__tests__/auth.test.js` — auth register/login endpoints + JWT middleware
- `server/__tests__/bots.test.js` — bot marketplace API (GET list, GET single, POST create, search)
- `server/__tests__/botRun.test.js` — bot execution endpoint (POST `/api/run/:deploymentId`)
- `server/__tests__/emailService.test.js` — email service unit tests

Jest is configured to match `**/__tests__/**/*.test.js` (set in `server/package.json` under the `"jest"` key).

## Jest Configuration

Defined inline in `server/package.json`:
```json
"jest": {
  "testEnvironment": "node",
  "testMatch": ["**/__tests__/**/*.test.js"],
  "setupFiles": ["./jest.setup.js"]
}
```

`server/jest.setup.js` runs before every suite and sets minimum required env vars so modules that read them at load time (e.g., `config/stripe.js`) do not crash during test discovery:
```js
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
```
Individual test files also set `process.env.JWT_SECRET = 'test-secret-key'` at the top to be self-contained, which is redundant but makes each file independently runnable without the setup file.

## Mocking Patterns

### Model Mocking (integration tests)
`auth.test.js` and `bots.test.js` use `jest.mock('../models/User')` / `jest.mock('../models/Bot')` to auto-mock the model modules. Individual mock implementations are set per-test with `mockResolvedValue()` / `mockRejectedValue()`. `beforeEach(() => jest.clearAllMocks())` resets state between tests.

This approach tests the full HTTP layer (route -> middleware -> controller) without a real database.

### Service Mocking
`botRun.test.js` uses `jest.mock('../services/aiService')` to prevent real OpenAI/Anthropic API calls. The pg pool is also mocked at the module level:
```js
jest.mock('../config/db', () => ({ query: jest.fn() }));
```
This factory mock replaces the entire `pg` Pool with a plain object containing a `jest.fn()` so `pool.query` can be configured per-test.

### Email Service / Module Isolation
`emailService.test.js` uses `jest.mock('nodemailer')` and then `jest.isolateModules()` to load a fresh copy of `emailService` for each test. This is necessary because `emailService` reads `process.env.EMAIL_HOST` at module load time (via `isConfigured()`). `jest.isolateModules` bypasses the module registry cache so each test can control the env state independently.

### Test App Construction
`botRun.test.js` constructs its own minimal Express app rather than importing `app.js`. This avoids needing to mock all modules that `app.js` initializes (Stripe, all routes, etc.) and keeps the test focused on just the `botRun` route:
```js
const testApp = express();
testApp.use(express.json());
testApp.post('/api/run/:deploymentId', authenticate, runBot);
```

`auth.test.js` and `bots.test.js` import `app.js` directly — this works because they mock the models before importing, so no DB connection is attempted.

### JWT Generation in Tests
Tests that require authenticated requests define a local `makeToken()` helper:
```js
const makeToken = (userId = 'user-uuid-1') =>
  jwt.sign({ userId }, 'test-secret-key', { expiresIn: '1h' });
```
This mirrors the real `signToken()` in `authController.js` using the same test secret.

## What Is Tested

### auth.test.js (11 tests)
- `POST /api/auth/register`: success (201 + JWT returned), missing fields (400), duplicate email (409)
- `POST /api/auth/login`: success (200 + JWT, password hash stripped), wrong password (401), non-existent user (401), missing fields (400)
- Auth middleware: valid JWT passes, no token blocked (401), tampered token blocked (401), expired token blocked (401)

### bots.test.js (10 tests)
- `GET /api/bots`: returns all bots, filters by category, returns empty array
- `GET /api/bots/:id`: returns single bot, 404 for non-existent bot
- `POST /api/bots`: creates when authenticated (creator_id from JWT not body), rejects without token (401), rejects missing fields (400), rejects negative price (400)
- Search: `?search=crypto`, `?search=signal` (matching), `?search=nonexistent` (empty)

### botRun.test.js (6 tests)
- Returns 400 when prompt is missing
- Returns 403 when deployment not found
- Returns 403 when deployment belongs to a different user
- Returns 403 when deployment status is not `active`
- Returns 503 when AI API key is not configured
- Returns 200 with `{ output, model, tokens }` on success
- Returns 401 when no JWT provided

### emailService.test.js (4 tests)
- `sendWelcomeEmail`: returns `{ sent: false }` when `EMAIL_HOST` not set; calls `sendMail` with correct `to`/`subject` when configured
- `sendPurchaseConfirmation`: returns `{ sent: false }` when not configured; calls `sendMail` with correct fields, body contains bot name and amount when configured

## What Is NOT Tested (Coverage Gaps)

### Server-side gaps
- **Payment controller** (`paymentController.js`): `createCheckout`, `handleWebhook`, `getMyPurchases`, `hasAccess` — no tests. The webhook handler contains complex branching logic (one-time vs subscription, Stripe event types).
- **Seller controller** (`sellerController.js`): `getMyBots`, `uploadBot`, `getSales`, `getStats` — no tests.
- **Deployment controller** (`deploymentController.js`): `deploy`, `getDeployments`, `stopDeployment` — no tests. The `deploy` function uses `setTimeout` for simulated async state change, which is particularly hard to test without a mock.
- **Lead controller** (`leadController.js`): `searchLeads`, `generateMessage`, `templateMessage` — no tests. The AI provider fallback chain (OpenAI -> Anthropic -> template) is complex and untested.
- **Models**: `Purchase`, `Subscription` — no tests. `Bot` and `User` are only exercised indirectly via mocks in controller tests, never with real SQL.
- **aiService.js**: `runWithOpenAI`, `runWithAnthropic`, `runBot` — unit tests are absent. The lazy-require pattern and provider routing logic are not directly tested.

### Client-side gaps
- **No client tests at all.** There is no Jest/Vitest/React Testing Library setup in `client/`. No component tests, no page tests, no utility tests.
- `client/lib/auth.js` utilities (`getToken`, `setToken`, `authHeaders`, `isAuthenticated`) are untested.
- `client/components/ProtectedRoute.js` and `PurchasedBotRoute.js` route guard logic is untested.
- The debounce logic in `marketplace.js` and the CSV export in `ai-lead-generator.js` are untested.

### Integration / E2E gaps
- No end-to-end tests (no Cypress, Playwright, or similar).
- No database migration or seed testing.
- Stripe webhook signature verification is not tested end-to-end.

## Notes on Test Architecture Quality

- Tests are self-contained: each sets its own env vars and does not rely on external state.
- `beforeEach(() => jest.clearAllMocks())` is used consistently across all describe blocks.
- The `app.js` / `index.js` split (entry point separated from app factory) was explicitly designed to enable `require('../app')` in tests without starting a TCP listener — noted in the file-level JSDoc of `server/app.js`.
- Test data is defined as module-level constants (e.g., the `BOTS` array in `bots.test.js`) and reused across describe blocks, keeping fixtures DRY.
