import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/preview/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/orchestrator', () => ({
  buildDailyIssue: vi.fn().mockImplementation(async (opts) => {
    // Assert isPreview is always true
    if (!opts?.isPreview) {
      throw new Error('Preview route must always call orchestrator with isPreview: true');
    }
    return {
      issue: {
        editionDate: '2026-10-21',
        headline: 'Preview Tech Headline',
        stories: [{}, {}, {}, {}],
      },
      pdfBuffer: Buffer.from('%PDF-1.4 preview'),
      feedStatuses: [{ name: 'OpenAI', success: true, itemCount: 5 }],
      wordCount: 520,
      isMockSample: true,
      // emailResult is explicitly undefined in preview!
      emailResult: undefined,
    };
  }),
}));

describe('Preview API Endpoint (/api/preview)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.PREVIEW_SECRET;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns preview issue without sending email', async () => {
    const req = new NextRequest('http://localhost:3000/api/preview');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.issue).toBeDefined();
    expect(body.issue.headline).toBe('Preview Tech Headline');
    expect(body.isMockSample).toBe(true);
    expect(body.wordCount).toBe(520);
    // Ensure email is not triggered
    expect(body.email).toBeUndefined();
  });

  it('enforces PREVIEW_SECRET when configured', async () => {
    process.env.PREVIEW_SECRET = 'secret-preview-pass';

    // Without secret: 401
    const req1 = new NextRequest('http://localhost:3000/api/preview');
    const res1 = await GET(req1);
    expect(res1.status).toBe(401);

    // With secret: 200
    const req2 = new NextRequest('http://localhost:3000/api/preview', {
      headers: {
        'x-preview-secret': 'secret-preview-pass',
      },
    });
    const res2 = await GET(req2);
    expect(res2.status).toBe(200);
  });
});
