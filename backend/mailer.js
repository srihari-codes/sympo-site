/**
 * Reusable Nodemailer transport configured from environment variables.
 *
 * Env vars:
 *   SMTP_HOST  – e.g. smtp-relay.brevo.com
 *   SMTP_PORT  – e.g. 587
 *   SMTP_USER  – Brevo login / API key
 *   SMTP_PASS  – Brevo SMTP key
 *   SMTP_FROM  – e.g. "Zyverse 2K26 <admin@whitehatians.in>"
 */
import nodemailer from 'nodemailer';

// Build the transport lazily so the app still boots if SMTP isn't configured.
let _transport = null;

function getTransport() {
  if (_transport) return _transport;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('⚠️  SMTP not configured — emails will be skipped.');
    return null;
  }

  _transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return _transport;
}

/**
 * Send an email. Resolves quietly if SMTP is not configured.
 *
 * @param {string} to       – recipient email address
 * @param {string} subject  – email subject line
 * @param {string} html     – HTML body
 * @returns {Promise<object|null>}
 */
export async function sendMail(to, subject, html) {
  const transport = getTransport();
  if (!transport) return null;

  const from = process.env.SMTP_FROM || '"Zyverse 2K26" <admin@whitehatians.in>';

  const info = await transport.sendMail({
    from,
    to,
    subject,
    html,
  });

  console.log(`📧 Email sent to ${to} — messageId: ${info.messageId}`);
  return info;
}
