import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/cron/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/orchestrator', () => ({
  buildDailyIssue: vi.fn().mockResolvedValue({
    issue: {
      editionDate: '2026-10-21',
      headline: 'Mocked Headline',
      stories: [{}, {}, {}, {}],
    },
    pdfBuffer: Buffer.from('%PDF-1.4 mock'),
    feedStatuses: [{ name: 'Test Feed', success: true, itemCount: 5 }],
    wordCount: 580,
    emailResult: { success: true, skipped: true },
  }),
}));

describe('Cron API Endpoint (/api/cron)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.CRON_SECRET = 'test-secret-123';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejects unauthorized requests with HTTP 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/cron');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Unauthorized');
  });

  it('rejects requests with invalid bearer token', async () => {
    const req = new NextRequest('http://localhost:3000/api/cron', {
      headers: {
        authorization: 'Bearer wrong-secret',
      },
    });
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('fails with 500 if GEMINI_API_KEY is missing on server', async () => {
    delete process.env.GEMINI_API_KEY;
    const req = new NextRequest('http://localhost:3000/api/cron', {
      headers: {
        authorization: 'Bearer test-secret-123',
      },
    });
    const res = await GET(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('Neither GROQ_API_KEY nor GEMINI_API_KEY is configured');
  });

  it('accepts authorized requests and returns run statistics', async () => {
    process.env.GEMINI_API_KEY = 'mock-gemini-key';
    const req = new NextRequest('http://localhost:3000/api/cron', {
      headers: {
        authorization: 'Bearer test-secret-123',
      },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('success');
    expect(body.editionDate).toBe('2026-10-21');
    expect(body.headline).toBe('Mocked Headline');
  });
});
