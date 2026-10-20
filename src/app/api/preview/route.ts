import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { buildDailyIssue } from '@/lib/orchestrator';
import { getConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function secureCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function GET(req: NextRequest) {
  const config = getConfig();

  // If PREVIEW_SECRET is set, protect the route
  if (config.previewSecret) {
    const headerSecret = req.headers.get('x-preview-secret') || '';
    const querySecret = req.nextUrl.searchParams.get('secret') || '';
    const provided = headerSecret || querySecret;

    if (!secureCompare(provided, config.previewSecret)) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid preview secret.' },
        { status: 401 }
      );
    }
  }

  try {
    const forceMock = req.nextUrl.searchParams.get('mock') === 'true';
    const result = await buildDailyIssue({
      isPreview: true,
      forceMock,
    });

    return NextResponse.json({
      issue: result.issue,
      wordCount: result.wordCount,
      isMockSample: result.isMockSample,
      feedStatuses: result.feedStatuses.map((f) => ({
        name: f.name,
        success: f.success,
        itemCount: f.itemCount,
        error: f.error,
      })),
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to generate preview issue.';
    console.error('[Preview] Failed to generate preview:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
