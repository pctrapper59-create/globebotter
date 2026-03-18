/**
 * Bot marketplace API tests.
 * Bot model is mocked — no real DB needed.
 * A real JWT is generated for protected-route tests.
 */

process.env.JWT_SECRET = 'test-secret-key';
process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../models/Bot');
const Bot = require('../models/Bot');

const app = require('../app');

// Helper — creates a signed token the middleware will accept
const makeToken = (userId = 'user-uuid-1') =>
  jwt.sign({ userId }, 'test-secret-key', { expiresIn: '1h' });

const BOTS = [
  { id: 'bot-1', name: 'Crypto Signal Bot', description: 'Profit alerts', price: 29.99, category: 'trading',      creator_id: 'user-uuid-1' },
  { id: 'bot-2', name: 'Local Lead Finder', description: 'Generate leads', price: 49.99, category: 'marketing',   creator_id: 'user-uuid-1' },
  { id: 'bot-3', name: 'Auto Social Poster', description: 'Schedule posts', price: 19.99, category: 'social_media', creator_id: 'user-uuid-2' },
];

// ---------------------------------------------------------------------------
// GET /api/bots
// ---------------------------------------------------------------------------
describe('GET /api/bots', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns all bots', async () => {
    Bot.findAll.mockResolvedValue(BOTS);

    const res = await request(app).get('/api/bots');

    expect(res.status).toBe(200);
    expect(res.body.bots).toHaveLength(3);
    expect(res.body.bots[0].name).toBe('Crypto Signal Bot');
  });

  test('filters bots by category', async () => {
    Bot.findAll.mockResolvedValue([BOTS[0]]);

    const res = await request(app).get('/api/bots?category=trading');

    expect(res.status).toBe(200);
    expect(Bot.findAll).toHaveBeenCalledWith({ category: 'trading' });
    expect(res.body.bots).toHaveLength(1);
    expect(res.body.bots[0].category).toBe('trading');
  });

  test('returns an empty array when no bots exist', async () => {
    Bot.findAll.mockResolvedValue([]);

    const res = await request(app).get('/api/bots');

    expect(res.status).toBe(200);
    expect(res.body.bots).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// GET /api/bots/:id
// ---------------------------------------------------------------------------
describe('GET /api/bots/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns a single bot by id', async () => {
    Bot.findById.mockResolvedValue(BOTS[0]);

    const res = await request(app).get('/api/bots/bot-1');

    expect(res.status).toBe(200);
    expect(res.body.bot.id).toBe('bot-1');
    expect(res.body.bot.name).toBe('Crypto Signal Bot');
  });

  test('returns 404 for a non-existent bot', async () => {
    Bot.findById.mockResolvedValue(null);

    const res = await request(app).get('/api/bots/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Bot not found');
  });
});

// ---------------------------------------------------------------------------
// POST /api/bots  (protected — requires JWT)
// ---------------------------------------------------------------------------
describe('POST /api/bots', () => {
  beforeEach(() => jest.clearAllMocks());

  const validPayload = {
    name: 'New Test Bot',
    description: 'Does something useful',
    price: 9.99,
    category: 'trading',
  };

  test('creates a bot when authenticated', async () => {
    const created = { id: 'bot-new', creator_id: 'user-uuid-1', ...validPayload };
    Bot.create.mockResolvedValue(created);

    const res = await request(app)
      .post('/api/bots')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.bot.name).toBe('New Test Bot');
    expect(res.body.bot.creator_id).toBe('user-uuid-1');
    // Verify creator_id is taken from the JWT, not the request body
    expect(Bot.create).toHaveBeenCalledWith(
      expect.objectContaining({ creator_id: 'user-uuid-1' })
    );
  });

  test('rejects bot creation without an auth token', async () => {
    const res = await request(app).post('/api/bots').send(validPayload);

    expect(res.status).toBe(401);
    expect(Bot.create).not.toHaveBeenCalled();
  });

  test('rejects bot creation when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/bots')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'Incomplete Bot' }); // missing description, price, category

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('name, description, price, and category are required');
    expect(Bot.create).not.toHaveBeenCalled();
  });

  test('rejects a negative price', async () => {
    const res = await request(app)
      .post('/api/bots')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ ...validPayload, price: -5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Price must be a positive number');
    expect(Bot.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// GET /api/bots — search
// ---------------------------------------------------------------------------
describe('GET /api/bots — search', () => {
  beforeEach(() => jest.clearAllMocks());

  test('GET /api/bots?search=crypto returns bots where name matches (case-insensitive)', async () => {
    const cryptoBot = BOTS[0]; // 'Crypto Signal Bot'
    Bot.findAll.mockResolvedValue([cryptoBot]);

    const res = await request(app).get('/api/bots?search=crypto');

    expect(res.status).toBe(200);
    expect(Bot.findAll).toHaveBeenCalledWith({ category: undefined, search: 'crypto' });
    expect(res.body.bots).toHaveLength(1);
    expect(res.body.bots[0].name).toBe('Crypto Signal Bot');
  });

  test('GET /api/bots?search=signal returns matching bots', async () => {
    const signalBot = BOTS[0]; // 'Crypto Signal Bot'
    Bot.findAll.mockResolvedValue([signalBot]);

    const res = await request(app).get('/api/bots?search=signal');

    expect(res.status).toBe(200);
    expect(Bot.findAll).toHaveBeenCalledWith({ category: undefined, search: 'signal' });
    expect(res.body.bots).toHaveLength(1);
    expect(res.body.bots[0].name).toBe('Crypto Signal Bot');
  });

  test('GET /api/bots?search=nonexistent returns empty array', async () => {
    Bot.findAll.mockResolvedValue([]);

    const res = await request(app).get('/api/bots?search=nonexistent');

    expect(res.status).toBe(200);
    expect(Bot.findAll).toHaveBeenCalledWith({ category: undefined, search: 'nonexistent' });
    expect(res.body.bots).toEqual([]);
  });
});
