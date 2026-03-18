/**
 * Unit tests for emailService.
 *
 * nodemailer's createTransport is mocked so no real SMTP connection is made.
 * EMAIL_HOST is controlled per-test via process.env to exercise both paths:
 *   - not configured → returns { sent: false, reason: 'not configured' }
 *   - configured     → calls transporter.sendMail with the right fields
 *
 * jest.isolateModules is used so each test loads a fresh copy of emailService
 * with the desired env state, without cross-test module caching.
 */

jest.mock('nodemailer');

const nodemailer = require('nodemailer');

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a fresh sendMail spy, register it on the nodemailer mock, then
 * require a fresh copy of emailService — all inside jest.isolateModules so
 * the module registry is private to this call.
 */
function loadServiceWithMock() {
  const sendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
  nodemailer.createTransport.mockReturnValue({ sendMail });

  let emailService;
  jest.isolateModules(() => {
    emailService = require('../services/emailService');
  });

  return { emailService, sendMail };
}

// ── sendWelcomeEmail ──────────────────────────────────────────────────────────

describe('emailService', () => {
  afterEach(() => {
    delete process.env.EMAIL_HOST;
    delete process.env.EMAIL_PORT;
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    delete process.env.EMAIL_FROM;
    jest.clearAllMocks();
  });

  describe('sendWelcomeEmail', () => {
    test('returns { sent: false } when EMAIL_HOST is not set', async () => {
      // EMAIL_HOST is absent (afterEach ensures clean state)
      const { emailService, sendMail } = loadServiceWithMock();

      const result = await emailService.sendWelcomeEmail({
        name: 'Alice',
        email: 'alice@test.com',
      });

      expect(result).toEqual({ sent: false, reason: 'not configured' });
      expect(sendMail).not.toHaveBeenCalled();
    });

    test('calls transporter.sendMail with correct to/subject when configured', async () => {
      process.env.EMAIL_HOST = 'smtp.example.com';
      process.env.EMAIL_PORT = '587';
      process.env.EMAIL_USER = 'noreply@globebotter.com';
      process.env.EMAIL_PASS = 'secret';
      process.env.EMAIL_FROM = 'GlobeBotter <noreply@globebotter.com>';

      const { emailService, sendMail } = loadServiceWithMock();

      const result = await emailService.sendWelcomeEmail({
        name: 'Alice',
        email: 'alice@test.com',
      });

      expect(sendMail).toHaveBeenCalledTimes(1);

      const mailOptions = sendMail.mock.calls[0][0];
      expect(mailOptions.to).toBe('alice@test.com');
      expect(typeof mailOptions.subject).toBe('string');
      expect(mailOptions.subject.length).toBeGreaterThan(0);

      expect(result).toEqual({ sent: true });
    });
  });

  // ── sendPurchaseConfirmation ────────────────────────────────────────────────

  describe('sendPurchaseConfirmation', () => {
    test('returns { sent: false } when EMAIL_HOST is not set', async () => {
      const { emailService, sendMail } = loadServiceWithMock();

      const result = await emailService.sendPurchaseConfirmation({
        email: 'alice@test.com',
        name: 'Alice',
        botName: 'TranslatorBot',
        amount: 9.99,
      });

      expect(result).toEqual({ sent: false, reason: 'not configured' });
      expect(sendMail).not.toHaveBeenCalled();
    });

    test('calls transporter.sendMail with correct fields when configured', async () => {
      process.env.EMAIL_HOST = 'smtp.example.com';
      process.env.EMAIL_PORT = '587';
      process.env.EMAIL_USER = 'noreply@globebotter.com';
      process.env.EMAIL_PASS = 'secret';
      process.env.EMAIL_FROM = 'GlobeBotter <noreply@globebotter.com>';

      const { emailService, sendMail } = loadServiceWithMock();

      const result = await emailService.sendPurchaseConfirmation({
        email: 'alice@test.com',
        name: 'Alice',
        botName: 'TranslatorBot',
        amount: 9.99,
      });

      expect(sendMail).toHaveBeenCalledTimes(1);

      const mailOptions = sendMail.mock.calls[0][0];
      expect(mailOptions.to).toBe('alice@test.com');
      expect(typeof mailOptions.subject).toBe('string');
      expect(mailOptions.subject.length).toBeGreaterThan(0);

      // The email body should mention the bot name and amount
      const body = mailOptions.html || mailOptions.text || '';
      expect(body).toContain('TranslatorBot');
      expect(body).toContain('9.99');

      expect(result).toEqual({ sent: true });
    });
  });
});
