/**
 * Builds and sends the registration-confirmation email.
 *
 * Called fire-and-forget from the registration route — a failed email must
 * never break the registration itself.
 */
import { sendMail } from '../mailer.js';

/**
 * @param {object} opts
 * @param {string} opts.to            – participant email
 * @param {string} opts.firstName     – participant's first name
 * @param {string} opts.eventName     – e.g. "Iron Throne"
 * @param {string} opts.eventTagline  – e.g. "Competitive Coding & Algorithmic Conquest"
 * @param {string} opts.transactionId – bank reference / UTR
 */
export async function sendRegistrationConfirmation({ to, firstName, eventName, eventTagline, transactionId }) {
  const subject = `⚔️ Registration Confirmed — ${eventName} | Zyverse 2K26`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Registration Confirmation</title>
</head>
<body style="margin:0; padding:0; background:#0d0c0a; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d0c0a;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Card -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px; width:100%; background:linear-gradient(180deg,#1a1814 0%,#12110e 100%);
                      border:1px solid rgba(201,168,76,0.25); border-radius:12px; overflow:hidden;">

          <!-- Header banner -->
          <tr>
            <td style="padding:36px 32px 20px; text-align:center;
                       background:linear-gradient(135deg,rgba(201,168,76,0.15) 0%,rgba(224,94,38,0.10) 100%);
                       border-bottom:1px solid rgba(201,168,76,0.18);">
              <h1 style="margin:0 0 6px; font-size:28px; font-weight:700; color:#f7eed7; letter-spacing:1px;">
                ZYVERSE 2K26
              </h1>
              <p style="margin:0; font-size:13px; letter-spacing:3px; text-transform:uppercase;
                        color:rgba(201,168,76,0.85);">
                Department of Cyber Security
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 16px;">
              <p style="margin:0 0 18px; font-size:17px; color:#f1f1f1; line-height:1.6;">
                Hi <strong style="color:#f7eed7;">${firstName || 'Participant'}</strong>,
              </p>
              <p style="margin:0 0 24px; font-size:16px; color:rgba(255,255,255,0.88); line-height:1.7;">
                Your registration for <strong style="color:#c9a84c;">${eventName}</strong> has been
                received successfully. Here are your details:
              </p>

              <!-- Details card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                     style="background:rgba(201,168,76,0.06); border:1px solid rgba(201,168,76,0.18);
                            border-radius:8px; margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0; font-size:13px; letter-spacing:1px; text-transform:uppercase;
                                   color:rgba(201,168,76,0.7); width:140px; vertical-align:top;">
                          Event
                        </td>
                        <td style="padding:6px 0; font-size:15px; color:#f7eed7; font-weight:600;">
                          ${eventName}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; font-size:13px; letter-spacing:1px; text-transform:uppercase;
                                   color:rgba(201,168,76,0.7); vertical-align:top;">
                          Category
                        </td>
                        <td style="padding:6px 0; font-size:14px; color:rgba(255,255,255,0.8);">
                          ${eventTagline}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; font-size:13px; letter-spacing:1px; text-transform:uppercase;
                                   color:rgba(201,168,76,0.7); vertical-align:top;">
                          Reference ID
                        </td>
                        <td style="padding:6px 0; font-size:14px; color:rgba(255,255,255,0.8);
                                   font-family:monospace; letter-spacing:0.5px;">
                          ${transactionId}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; font-size:13px; letter-spacing:1px; text-transform:uppercase;
                                   color:rgba(201,168,76,0.7); vertical-align:top;">
                          Status
                        </td>
                        <td style="padding:6px 0;">
                          <span style="display:inline-block; padding:3px 12px; font-size:12px; font-weight:700;
                                       letter-spacing:1px; text-transform:uppercase; border-radius:4px;
                                       background:rgba(255,180,0,0.15); color:#f0c040; border:1px solid rgba(255,180,0,0.3);">
                            Pending Approval
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; font-size:13px; letter-spacing:1px; text-transform:uppercase;
                                   color:rgba(201,168,76,0.7); vertical-align:top;">
                          Date
                        </td>
                        <td style="padding:6px 0; font-size:14px; color:rgba(255,255,255,0.8);">
                          12 September 2026
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px; font-size:14px; color:rgba(255,255,255,0.7); line-height:1.7;">
                Your payment is being reviewed by our team. You'll receive an update once it's approved.
                Please carry your <strong style="color:#f7eed7;">college ID card</strong> and the
                <strong style="color:#f7eed7;">confirmation email</strong> on the day of the event.
              </p>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
                <tr>
                  <td style="border-radius:6px; background:linear-gradient(90deg,#c9a84c,#e05e26);">
                    <a href="https://zyverse.whitehatians.in"
                       style="display:inline-block; padding:14px 36px; font-size:14px; font-weight:700;
                              letter-spacing:1.5px; text-transform:uppercase; color:#fff; text-decoration:none;">
                      Visit Zyverse
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px; text-align:center;
                       border-top:1px solid rgba(201,168,76,0.12);">
              <p style="margin:0 0 4px; font-size:12px; color:rgba(255,255,255,0.4);">
                SRM Valliammai Engineering College — Department of Cyber Security
              </p>
              <p style="margin:0; font-size:11px; color:rgba(255,255,255,0.25);">
                In association with SRMVEC CSI Student Branch, WhiteHatians Club & IQAC
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return sendMail(to, subject, html);
}
