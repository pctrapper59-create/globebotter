/**
 * Auth integration tests.
 * User model is mocked — no real DB connection needed.
 * JWT_SECRET is set inline so tests are self-contained.
 */

process.env.JWT_SECRET = 'test-secret-key';

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock the User model so tests never touch the DB
jest.mock('../models/User');
const User = require('../models/User');

const app = require('../app');

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
describe('POST /api/auth/register', () => {
  beforeEach(() => jest.clearAllMocks());

  test('registers a new user and returns a JWT token', async () => {
    User.findByEmail.mockResolvedValue(null);
    User.create.mockResolvedValue({ id: 'uuid-1', name: 'Alice', email: 'alice@test.com' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@test.com', password: 'Password1!' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('alice@test.com');
    expect(res.body.user.password).toBeUndefined(); // never expose hash
  });

  test('rejects registration when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@test.com' }); // missing name + password

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  test('rejects registration when email is already taken', async () => {
    User.findByEmail.mockResolvedValue({ id: 'uuid-1', email: 'alice@test.com' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@test.com', password: 'Password1!' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already registered');
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  test('logs in with valid credentials and returns a JWT token', async () => {
    const hashed = await bcrypt.hash('password123', 10);
    User.findByEmail.mockResolvedValue({
      id: 'uuid-1',
      name: 'Alice',
      email: 'alice@test.com',
      password: hashed,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('alice@test.com');
    expect(res.body.user.password).toBeUndefined();
  });

  test('rejects login with wrong password', async () => {
    const hashed = await bcrypt.hash('correctpassword', 10);
    User.findByEmail.mockResolvedValue({
      id: 'uuid-1',
      email: 'alice@test.com',
      password: hashed,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  test('rejects login for a non-existent user', async () => {
    User.findByEmail.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@test.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  test('rejects login when fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@test.com' }); // missing password

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });
});

// ---------------------------------------------------------------------------
// Auth middleware (tested via an in-test protected route)
// ---------------------------------------------------------------------------
describe('Auth middleware', () => {
  let protectedApp;

  beforeAll(() => {
    const express = require('express');
    const authenticate = require('../middleware/auth');
    protectedApp = express();
    protectedApp.use(express.json());
    protectedApp.get('/protected', authenticate, (req, res) => {
      res.json({ userId: req.user.userId });
    });
  });

  test('allows a request with a valid JWT', async () => {
    const token = jwt.sign({ userId: 'uuid-42' }, 'test-secret-key', { expiresIn: '1h' });

    const res = await request(protectedApp)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('uuid-42');
  });

  test('blocks a request with no token', async () => {
    const res = await request(protectedApp).get('/protected');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });

  test('blocks a request with a tampered or invalid token', async () => {
    const res = await request(protectedApp)
      .get('/protected')
      .set('Authorization', 'Bearer this.is.not.valid');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired token');
  });

  test('blocks a request with an expired token', async () => {
    const token = jwt.sign({ userId: 'uuid-42' }, 'test-secret-key', { expiresIn: '-1s' });

    const res = await request(protectedApp)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired token');
  });
});
