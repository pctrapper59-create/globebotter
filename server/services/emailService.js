/**
 * emailService — nodemailer-based transactional email helpers.
 *
 * Configuration is read from environment variables at module load time:
 *   EMAIL_HOST   SMTP host (e.g. smtp.example.com)
 *   EMAIL_PORT   SMTP port (default 587)
 *   EMAIL_USER   SMTP username
 *   EMAIL_PASS   SMTP password
 *   EMAIL_FROM   "From" header (e.g. "GlobeBotter <noreply@globebotter.com>")
 *
 * When EMAIL_HOST is not set the service silently skips sending and returns
 * { sent: false, reason: 'not configured' } so callers never need to branch.
 */

const nodemailer = require('nodemailer');

// Build transporter only when EMAIL_HOST is present
const isConfigured = () => Boolean(process.env.EMAIL_HOST);

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

/**
 * Send a welcome email to a newly registered user.
 * @param {{ name: string, email: string }} params
 * @returns {Promise<{ sent: boolean, reason?: string }>}
 */
const sendWelcomeEmail = async ({ name, email }) => {
  if (!isConfigured()) {
    return { sent: false, reason: 'not configured' };
  }

  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || 'GlobeBotter <noreply@globebotter.com>';

  await transporter.sendMail({
    from,
    to: email,
    subject: `Welcome to GlobeBotter, ${name}!`,
    html: `
      <h1>Welcome, ${name}!</h1>
      <p>Thanks for joining GlobeBotter — your AI bot marketplace.</p>
      <p>Explore bots, deploy them in minutes, and start automating.</p>
      <p>— The GlobeBotter Team</p>
    `,
    text: `Welcome, ${name}!\n\nThanks for joining GlobeBotter — your AI bot marketplace.\nExplore bots, deploy them in minutes, and start automating.\n\n— The GlobeBotter Team`,
  });

  return { sent: true };
};

/**
 * Send a purchase confirmation email after a successful checkout.
 * @param {{ email: string, name: string, botName: string, amount: number }} params
 * @returns {Promise<{ sent: boolean, reason?: string }>}
 */
const sendPurchaseConfirmation = async ({ email, name, botName, amount }) => {
  if (!isConfigured()) {
    return { sent: false, reason: 'not configured' };
  }

  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || 'GlobeBotter <noreply@globebotter.com>';

  await transporter.sendMail({
    from,
    to: email,
    subject: `Your purchase of ${botName} is confirmed!`,
    html: `
      <h1>Purchase Confirmed</h1>
      <p>Hi ${name},</p>
      <p>Your purchase of <strong>${botName}</strong> for <strong>$${amount}</strong> was successful.</p>
      <p>Head to your <a href="${process.env.CLIENT_URL || 'https://globebotter.com'}/dashboard">dashboard</a> to start using it.</p>
      <p>— The GlobeBotter Team</p>
    `,
    text: `Purchase Confirmed\n\nHi ${name},\n\nYour purchase of ${botName} for $${amount} was successful.\nVisit your dashboard to start using it.\n\n— The GlobeBotter Team`,
  });

  return { sent: true };
};

module.exports = { sendWelcomeEmail, sendPurchaseConfirmation };
