/**
 * Bot run integration tests (TDD — write first, implement second).
 *
 * This test file builds its own Express app so the botRun route can be
 * tested without modifying the main app.js (which the user will wire
 * themselves).
 *
 * Mocks:
 *   - ../services/aiService  — avoid real API calls
 *   - ../config/db           — avoid real DB connections
 *
 * JWT_SECRET is set inline so tests are self-contained.
 */

process.env.JWT_SECRET = 'test-secret-key';

const request = require('supertest');
const express = require('express');
const jwt     = require('jsonwebtoken');

// ---------------------------------------------------------------------------
// Mock aiService before any module that depends on it is loaded
// ---------------------------------------------------------------------------
jest.mock('../services/aiService');
const aiService = require('../services/aiService');

// ---------------------------------------------------------------------------
// Mock pg pool — pool.query is used directly in botRunController
// ---------------------------------------------------------------------------
jest.mock('../config/db', () => ({
  query: jest.fn(),
}));
const pool = require('../config/db');

// ---------------------------------------------------------------------------
// Build a minimal test app with the botRun route mounted.
// We do NOT import the main app so we avoid touching app.js.
// ---------------------------------------------------------------------------
const authenticate  = require('../middleware/auth');
const { runBot }    = require('../controllers/botRunController');

const testApp = express();
testApp.use(express.json());
testApp.post('/api/run/:deploymentId', authenticate, runBot);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeToken = (userId = 'user-uuid-1') =>
  jwt.sign({ userId }, 'test-secret-key', { expiresIn: '1h' });

const DEPLOYMENT_ID = 'deploy-uuid-1';
const USER_ID       = 'user-uuid-1';

const fakeDeployment = {
  id:      DEPLOYMENT_ID,
  user_id: USER_ID,
  bot_id:  'bot-uuid-1',
  status:  'active',
};

// ---------------------------------------------------------------------------
// POST /api/run/:deploymentId
// ---------------------------------------------------------------------------
describe('POST /api/run/:deploymentId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Returns 400 when prompt is missing
  test('returns 400 when prompt is missing', async () => {
    pool.query.mockResolvedValue({ rows: [fakeDeployment] });

    const res = await request(testApp)
      .post(`/api/run/${DEPLOYMENT_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});  // no prompt

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/prompt/i);
  });

  // 2. Returns 403 when deployment not found or doesn't belong to user
  test('returns 403 when deployment is not found', async () => {
    pool.query.mockResolvedValue({ rows: [] }); // no matching deployment

    const res = await request(testApp)
      .post(`/api/run/${DEPLOYMENT_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ prompt: 'Hello bot' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
  });

  test('returns 403 when deployment belongs to a different user', async () => {
    pool.query.mockResolvedValue({
      rows: [{ ...fakeDeployment, user_id: 'other-user-uuid' }],
    });

    const res = await request(testApp)
      .post(`/api/run/${DEPLOYMENT_ID}`)
      .set('Authorization', `Bearer ${makeToken('user-uuid-1')}`)
      .send({ prompt: 'Hello bot' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
  });

  test('returns 403 when deployment status is not active', async () => {
    pool.query.mockResolvedValue({
      rows: [{ ...fakeDeployment, status: 'stopped' }],
    });

    const res = await request(testApp)
      .post(`/api/run/${DEPLOYMENT_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ prompt: 'Hello bot' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
  });

  // 3. Returns 503 when aiService throws 'API key not configured'
  test('returns 503 when AI API key is not configured', async () => {
    pool.query.mockResolvedValue({ rows: [fakeDeployment] });
    aiService.runBot.mockRejectedValue(new Error('API key not configured'));

    const res = await request(testApp)
      .post(`/api/run/${DEPLOYMENT_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ prompt: 'Hello bot' });

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/API key/i);
  });

  // 4. Returns 200 with { output, model, tokens } on success
  test('returns 200 with output, model, and tokens on success', async () => {
    pool.query.mockResolvedValue({ rows: [fakeDeployment] });
    aiService.runBot.mockResolvedValue({
      output: 'Hello from the bot!',
      model:  'gpt-4o-mini',
      tokens: 42,
    });

    const res = await request(testApp)
      .post(`/api/run/${DEPLOYMENT_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ prompt: 'Hello bot' });

    expect(res.status).toBe(200);
    expect(res.body.output).toBe('Hello from the bot!');
    expect(res.body.model).toBe('gpt-4o-mini');
    expect(res.body.tokens).toBe(42);
    expect(aiService.runBot).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'Hello bot', provider: 'openai' })
    );
  });

  // 5. Returns 401 when no JWT token is provided
  test('returns 401 when no JWT token is provided', async () => {
    const res = await request(testApp)
      .post(`/api/run/${DEPLOYMENT_ID}`)
      .send({ prompt: 'Hello bot' }); // no Authorization header

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });
});
