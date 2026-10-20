import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendIssueEmail } from '@/lib/email';
import { SAMPLE_ISSUE } from '@/lib/sample-issue';

vi.mock('resend', () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: vi.fn().mockResolvedValue({
          data: { id: 'mock-msg-id-12345' },
          error: null,
        }),
      },
    })),
  };
});

describe('Email Delivery Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('skips email delivery by default (EMAIL_DELIVERY_ENABLED not set)', async () => {
    delete process.env.EMAIL_DELIVERY_ENABLED;

    const result = await sendIssueEmail({
      issue: SAMPLE_ISSUE,
      pdfBuffer: Buffer.from('%PDF-1.4 test'),
    });

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.error).toContain('disabled by default');
  });

  it('reports missing API key when delivery is enabled but key is omitted', async () => {
    process.env.EMAIL_DELIVERY_ENABLED = 'true';
    delete process.env.RESEND_API_KEY;

    const result = await sendIssueEmail({
      issue: SAMPLE_ISSUE,
      pdfBuffer: Buffer.from('%PDF-1.4 test'),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('RESEND_API_KEY is not configured');
  });

  it('sends email with PDF attachment and date-based idempotency key when configured', async () => {
    process.env.EMAIL_DELIVERY_ENABLED = 'true';
    process.env.RESEND_API_KEY = 're_test_mock_key';
    process.env.EMAIL_TO = 'student@example.com';
    process.env.EMAIL_FROM = 'Zizou <news@test.com>';

    const result = await sendIssueEmail({
      issue: SAMPLE_ISSUE,
      pdfBuffer: Buffer.from('%PDF-1.4 test'),
      idempotencyKey: 'zizou-2026-10-21',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('mock-msg-id-12345');
  });
});
