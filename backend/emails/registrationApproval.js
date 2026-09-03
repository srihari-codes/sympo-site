/**
 * Builds and sends registration approval / status update email when an admin
 * approves or rejects a participant's registration from the Admin Dashboard.
 */
import { sendMail } from '../mailer.js';

/**
 * @param {object} opts
 * @param {string} opts.to            – participant email
 * @param {string} opts.firstName     – participant's first name
 * @param {string} opts.eventName     – e.g. "Iron Throne"
 * @param {string} opts.eventTagline  – e.g. "Jeopardy-Style Capture The Flag (CTF)"
 * @param {string} opts.transactionId – bank reference / UTR
 * @param {string} opts.status        – "approved" | "rejected"
 */
export async function sendRegistrationApproval({
  to,
  firstName,
  eventId,
  eventName,
  eventTagline,
  transactionId,
  status = 'approved',
  whatsappGroupUrl = process.env.WHATSAPP_GROUP_URL || 'https://chat.whatsapp.com/B8zEatW7uZf0L0JVe6j5f7',
  scrollsFormUrl = process.env.SCROLLS_FORM_URL || 'https://docs.google.com/forms/d/e/1FAIpQLScsPe2A21E9C0XleWp2AFAVBPyaUc15bVp-vk9evToW7j3c_A/viewform?usp=publish-editor',
}) {
  const isApproved = status === 'approved';
  const isScrolls = eventId === 'scrolls-of-the-realm' || (eventName && eventName.toLowerCase().includes('scrolls'));

  const subject = isApproved
    ? `🎉 Registration Approved — ${eventName} | Zyverse 2K26`
    : `⚠️ Registration Status Update — ${eventName} | Zyverse 2K26`;

  const statusBadge = isApproved
    ? `<span style="display:inline-block; padding:4px 14px; font-size:12px; font-weight:700;
                   letter-spacing:1px; text-transform:uppercase; border-radius:4px;
                   background:rgba(34,197,94,0.18); color:#4ade80; border:1px solid rgba(34,197,94,0.4);">
         ✓ Approved & Confirmed
       </span>`
    : `<span style="display:inline-block; padding:4px 14px; font-size:12px; font-weight:700;
                   letter-spacing:1px; text-transform:uppercase; border-radius:4px;
                   background:rgba(239,68,68,0.18); color:#f87171; border:1px solid rgba(239,68,68,0.4);">
         ✕ Registration Rejected
       </span>`;

  const statusMessage = isApproved
    ? `Great news! Your payment and registration for <strong style="color:#c9a84c;">${eventName}</strong> have been <strong style="color:#4ade80;">APPROVED</strong>. Your spot in Zyverse 2K26 is officially confirmed!`
    : `Your payment / registration for <strong style="color:#c9a84c;">${eventName}</strong> could not be verified by our team. If you believe this is an error, please contact the event coordinators with your payment reference details.`;

  const whatsappUrl = whatsappGroupUrl;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0; padding:0; background:#0d0c0a; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d0c0a;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Card -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px; width:100%; background:linear-gradient(180deg,#1a1814 0%,#12110e 100%);
                      border:1px solid ${isApproved ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}; border-radius:12px; overflow:hidden;">

          <!-- Header banner -->
          <tr>
            <td style="padding:36px 32px 20px; text-align:center;
                       background:linear-gradient(135deg,${isApproved ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'} 0%,rgba(201,168,76,0.10) 100%);
                       border-bottom:1px solid ${isApproved ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'};">
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
                ${statusMessage}
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
                      ${
                        eventTagline
                          ? `<tr>
                        <td style="padding:6px 0; font-size:13px; letter-spacing:1px; text-transform:uppercase;
                                   color:rgba(201,168,76,0.7); vertical-align:top;">
                          Category
                        </td>
                        <td style="padding:6px 0; font-size:14px; color:rgba(255,255,255,0.8);">
                          ${eventTagline}
                        </td>
                      </tr>`
                          : ''
                      }
                      <tr>
                        <td style="padding:6px 0; font-size:13px; letter-spacing:1px; text-transform:uppercase;
                                   color:rgba(201,168,76,0.7); vertical-align:top;">
                          Reference ID
                        </td>
                        <td style="padding:6px 0; font-size:14px; color:rgba(255,255,255,0.8);
                                   font-family:monospace; letter-spacing:0.5px;">
                          ${transactionId || 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; font-size:13px; letter-spacing:1px; text-transform:uppercase;
                                   color:rgba(201,168,76,0.7); vertical-align:top;">
                          Status
                        </td>
                        <td style="padding:6px 0;">
                          ${statusBadge}
                        </td>
                      </tr>
                      ${
                        isApproved
                          ? `<tr>
                        <td style="padding:6px 0; font-size:13px; letter-spacing:1px; text-transform:uppercase;
                                   color:rgba(201,168,76,0.7); vertical-align:top;">
                          Event Date
                        </td>
                        <td style="padding:6px 0; font-size:14px; color:rgba(255,255,255,0.8);">
                          12 September 2026
                        </td>
                      </tr>`
                          : ''
                      }
                    </table>
                  </td>
                </tr>
              </table>

              ${
                isApproved
                  ? `<!-- WhatsApp Group Invitation Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                     style="background:rgba(37,211,102,0.08); border:1px solid rgba(37,211,102,0.3);
                            border-radius:8px; margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px; text-align:center;">
                    <p style="margin:0 0 8px; font-size:15px; font-weight:700; color:#25D366; letter-spacing:0.5px;">
                      💬 JOIN OFFICIAL WHATSAPP GROUP
                    </p>
                    <p style="margin:0 0 16px; font-size:14px; color:rgba(255,255,255,0.85); line-height:1.5;">
                      Please join the official WhatsApp group for live event updates, schedule announcements, and coordinator communication.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                      <tr>
                        <td style="border-radius:6px; background:#25D366;">
                          <a href="${whatsappUrl}" target="_blank"
                             style="display:inline-block; padding:12px 28px; font-size:14px; font-weight:700;
                                    color:#0d0c0a; text-decoration:none; border-radius:6px; letter-spacing:0.5px;">
                            Join WhatsApp Group
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${
                isScrolls
                  ? `<!-- Scrolls of the Realm Form Invitation Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                     style="background:rgba(201,168,76,0.10); border:1px solid rgba(201,168,76,0.35);
                            border-radius:8px; margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px; text-align:center;">
                    <p style="margin:0 0 8px; font-size:15px; font-weight:700; color:#f7eed7; letter-spacing:0.5px;">
                      📜 SUBMIT PAPER / PRESENTATION DETAILS
                    </p>
                    <p style="margin:0 0 16px; font-size:14px; color:rgba(255,255,255,0.85); line-height:1.5;">
                      As a confirmed participant of <strong>Scrolls of the Realm</strong>, please complete the official submission form with your paper details and presentation slides.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                      <tr>
                        <td style="border-radius:6px; background:linear-gradient(90deg,#c9a84c,#e05e26);">
                          <a href="${scrollsFormUrl}" target="_blank"
                             style="display:inline-block; padding:12px 28px; font-size:14px; font-weight:700;
                                    color:#ffffff; text-decoration:none; border-radius:6px; letter-spacing:0.5px;">
                            Fill Submission Form
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>`
                  : ''
              }

              <p style="margin:0 0 24px; font-size:14px; color:rgba(255,255,255,0.7); line-height:1.7;">
                📌 <strong style="color:#f7eed7;">Important Instructions for Event Day:</strong><br />
                • Please carry your <strong style="color:#f7eed7;">College ID Card</strong>.<br />
                • Join the official <a href="${whatsappUrl}" target="_blank" style="color:#25D366; text-decoration:underline;">WhatsApp Group</a> for real-time announcements.<br />
                ${isScrolls ? `• Submit your paper details using the <a href="${scrollsFormUrl}" target="_blank" style="color:#c9a84c; text-decoration:underline;">Scrolls of the Realm Form</a>.<br />` : ''}
                • Keep a digital or printed copy of this approval email handy at the registration desk.<br />
                • Report to the main foyer by 08:30 AM.
              </p>`
                  : ''
              }

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
                <tr>
                  <td style="border-radius:6px; background:linear-gradient(90deg,#c9a84c,#e05e26);">
                    <a href="https://zyverse.whitehatians.in"
                       style="display:inline-block; padding:14px 36px; font-size:14px; font-weight:700;
                              letter-spacing:1.5px; text-transform:uppercase; color:#fff; text-decoration:none;">
                      Visit Zyverse Portal
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

