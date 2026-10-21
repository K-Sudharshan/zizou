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

  const recipients = config.emailTo
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    const errorMsg = 'EMAIL_TO is not configured. Cannot send daily email.';
    console.error(`[Email] ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  const resend = new Resend(config.resendApiKey);
  const idempotencyKey =
    params.idempotencyKey || `zizou-${issue.editionDate}`;
  const displayDate = formatDisplayDate(issue.editionDate);

  const subject = `Zizou: ${issue.headline} (${issue.editionDate})`;

  // Neat, concise Good Morning note with PDF attachment notice
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 24px 16px; background-color: #f3eee2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #101b33;">
        <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1.5px solid #101b33; border-radius: 4px; padding: 32px 28px; box-shadow: 4px 4px 0 #101b33;">
          
          <!-- Masthead & Date -->
          <div style="border-bottom: 2px solid #101b33; padding-bottom: 12px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="font-family: Georgia, serif; font-size: 26px; font-weight: 700; color: #101b33; letter-spacing: -0.5px;">Zizou</td>
                <td style="text-align: right; font-size: 12px; color: #4a5469; font-family: ui-monospace, Menlo, monospace;">${escapeHtml(displayDate)}</td>
              </tr>
            </table>
          </div>

          <!-- Greeting -->
          <h2 style="font-family: Georgia, serif; font-size: 21px; font-weight: 600; color: #101b33; margin: 0 0 12px 0;">
            Good morning!
          </h2>

          <p style="font-size: 15px; line-height: 1.6; color: #4a5469; margin: 0 0 18px 0;">
            Here is today’s 5-minute edition of <strong>Zizou</strong>. Your daily morning intelligence brief is ready.
          </p>

          <!-- Today's Lead Story Highlight -->
          <div style="background-color: #f3eee2; border-left: 3.5px solid #1b3fd6; padding: 14px 16px; margin: 0 0 22px 0; border-radius: 2px;">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #1b3fd6; margin-bottom: 5px; letter-spacing: 0.5px;">
              Today’s Lead Story
            </div>
            <div style="font-family: Georgia, serif; font-size: 16px; font-weight: 600; color: #101b33; line-height: 1.4;">
              ${escapeHtml(issue.headline)}
            </div>
            <p style="font-size: 13.5px; line-height: 1.5; color: #4a5469; margin: 6px 0 0 0;">
              ${escapeHtml(issue.summary)}
            </p>
          </div>

          <!-- PDF Attachment Notice -->
          <div style="background-color: #ebe5d5; border: 1.5px dashed #101b33; border-radius: 4px; padding: 14px 18px; margin: 0 0 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 30px; font-size: 22px; vertical-align: top;">📎</td>
                <td style="font-size: 13.5px; color: #101b33; line-height: 1.45;">
                  <strong>Your 2-page newspaper PDF is attached.</strong><br>
                  Formatted for comfortable reading with clickable links to all original source articles.
                </td>
              </tr>
            </table>
          </div>

          <p style="font-size: 14px; line-height: 1.5; color: #4a5469; margin: 0 0 6px 0;">
            Have a great day ahead,<br>
            <strong style="color: #101b33;">The Zizou Editor</strong>
          </p>

          <!-- Footer -->
          <div style="margin-top: 28px; padding-top: 14px; border-top: 1px solid #c9c1ab; font-size: 11px; color: #4a5469; text-align: center;">
            Delivered daily at 08:00 IST &bull; Zizou
          </div>

        </div>
      </body>
    </html>
  `;

  try {
    const filename = `zizou-${issue.editionDate}.pdf`;
    const response = await resend.emails.send({
      from: config.emailFrom,
      to: recipients,
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
      `[Email] Successfully delivered issue ${issue.editionDate} to ${recipients.join(', ')}. Message ID: ${response.data?.id}`
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
