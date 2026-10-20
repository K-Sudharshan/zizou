import { Resend } from 'resend';
import { Issue } from './schema';
import { getConfig, formatDisplayDate } from './config';

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;
}

/**
 * Escapes HTML characters in untrusted text for safe email HTML rendering.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sends the daily newspaper PDF via email using Resend.
 * Enforces server-side checks: delivery enabled flag, credentials, and idempotency key.
 */
export async function sendIssueEmail(params: {
  issue: Issue;
  pdfBuffer: Buffer;
  idempotencyKey?: string;
  forceSend?: boolean;
}): Promise<EmailDeliveryResult> {
  const config = getConfig();
  const { issue, pdfBuffer, forceSend = false } = params;

  // Strict check: delivery must be explicitly enabled unless forced in a test/override
  if (!config.emailDeliveryEnabled && !forceSend) {
    console.info(
      `[Email] Delivery disabled by configuration (EMAIL_DELIVERY_ENABLED is not 'true'). Skipping email.`
    );
    return {
      success: true,
      skipped: true,
      error: 'Email delivery is disabled by default. Set EMAIL_DELIVERY_ENABLED=true in production.',
    };
  }

  if (!config.resendApiKey) {
    const errorMsg = 'RESEND_API_KEY is not configured. Cannot send daily email.';
    console.error(`[Email] ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  if (!config.emailTo) {
    const errorMsg = 'EMAIL_TO is not configured. Cannot send daily email.';
    console.error(`[Email] ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  const resend = new Resend(config.resendApiKey);
  const idempotencyKey =
    params.idempotencyKey || `zizou-${issue.editionDate}`;
  const displayDate = formatDisplayDate(issue.editionDate);

  const subject = `Zizou: ${issue.headline} (${issue.editionDate})`;

  // HTML content for email body
  const storiesHtml = issue.stories
    .map(
      (s) => `
      <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-size: 11px; font-weight: bold; color: #2563eb; text-transform: uppercase;">
          ${escapeHtml(s.section)} &bull; ${escapeHtml(s.sourceName)}
        </div>
        <h3 style="margin: 4px 0 8px 0; font-size: 16px; color: #111827;">
          ${escapeHtml(s.title)}
        </h3>
        <p style="margin: 0 0 6px 0; font-size: 14px; color: #374151; line-height: 1.5;">
          <strong>What happened:</strong> ${escapeHtml(s.whatHappened)}
        </p>
        <p style="margin: 0 0 6px 0; font-size: 14px; color: #374151; line-height: 1.5;">
          <strong>Why it matters:</strong> ${escapeHtml(s.whyItMatters)}
        </p>
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #059669; line-height: 1.4;">
          <strong>Next step:</strong> ${escapeHtml(s.nextStep)}
        </p>
        <a href="${escapeHtml(s.sourceUrl)}" style="font-size: 12px; color: #2563eb; text-decoration: underline;">
          Read original source &rarr;
        </a>
      </div>
    `
    )
    .join('');

  const nextMovesHtml = issue.nextMoves
    .map(
      (m) => `
      <li style="margin-bottom: 8px; font-size: 13px; color: #1f2937;">
        <span style="font-weight: bold; color: ${m.isVerifiedOpportunity ? '#059669' : '#4b5563'};">
          [${m.category.toUpperCase()}]
        </span>
        ${escapeHtml(m.action)}
      </li>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 24px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <!-- Header -->
          <div style="background-color: #111827; color: #ffffff; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px;">ZIZOU</h1>
            <p style="margin: 6px 0 0 0; font-size: 12px; color: #9ca3af; text-transform: uppercase;">
              ${escapeHtml(displayDate)} &bull; 5-MINUTE TECH BRIEF
            </p>
          </div>

          <!-- Body -->
          <div style="padding: 24px;">
            <div style="margin-bottom: 24px; background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 16px;">
              <h2 style="margin: 0 0 6px 0; font-size: 18px; color: #0f172a;">
                ${escapeHtml(issue.headline)}
              </h2>
              <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.5;">
                ${escapeHtml(issue.summary)}
              </p>
            </div>

            <!-- Stories -->
            <div style="margin-bottom: 24px;">
              ${storiesHtml}
            </div>

            <!-- Next Moves -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
              <h4 style="margin: 0 0 10px 0; font-size: 13px; color: #0f172a; text-transform: uppercase;">
                Your Next Move
              </h4>
              <ul style="margin: 0; padding-left: 18px;">
                ${nextMovesHtml}
              </ul>
            </div>

            <!-- Attachment Note -->
            <p style="font-size: 13px; color: #6b7280; text-align: center; margin: 20px 0 0 0;">
              📎 <strong>A formatted newspaper PDF</strong> with clickable source links is attached to this email.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af;">
            Sent daily at 08:00 IST &bull; Zizou for Early-Career Engineers
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const filename = `zizou-${issue.editionDate}.pdf`;
    const response = await resend.emails.send({
      from: config.emailFrom,
      to: [config.emailTo],
      subject,
      html,
      attachments: [
        {
          filename,
          content: pdfBuffer,
        },
      ],
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });

    if (response.error) {
      console.error('[Email] Resend API error:', response.error.message);
      return {
        success: false,
        error: response.error.message,
      };
    }

    console.info(
      `[Email] Successfully delivered issue ${issue.editionDate} to ${config.emailTo}. Message ID: ${response.data?.id}`
    );

    return {
      success: true,
      messageId: response.data?.id,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : 'Unknown email delivery error';
    console.error('[Email] Delivery exception:', errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
