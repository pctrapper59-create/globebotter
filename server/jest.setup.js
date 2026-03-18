/**
 * Jest setup file — runs before every test suite.
 * Sets environment variables that must be present before any module
 * (e.g. config/stripe.js) is loaded during test discovery.
 */
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
