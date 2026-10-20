import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { buildDailyIssue } from '@/lib/orchestrator';
import { getConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function secureCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  const config = getConfig();

  // Authentication check
  const authHeader = req.headers.get('authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : '';
  const headerSecret = req.headers.get('x-cron-secret') || '';
  const providedSecret = bearerToken || headerSecret;

  if (!config.cronSecret || !secureCompare(providedSecret, config.cronSecret)) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing cron secret token.' },
      { status: 401 }
    );
  }

  // Pre-flight check: ensure an AI key is configured for production cron
  if (!config.groqApiKey && !config.geminiApiKey) {
    return NextResponse.json(
      {
        error:
          'Neither GROQ_API_KEY nor GEMINI_API_KEY is configured on the server. Cannot execute daily cron.',
      },
      { status: 500 }
    );
  }

  try {
    const result = await buildDailyIssue({ isPreview: false });

    return NextResponse.json({
      status: 'success',
      editionDate: result.issue.editionDate,
      headline: result.issue.headline,
      storyCount: result.issue.stories.length,
      wordCount: result.wordCount,
      feeds: result.feedStatuses.map((f) => ({
        name: f.name,
        success: f.success,
        itemCount: f.itemCount,
        error: f.error,
      })),
      email: result.emailResult,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : 'Unknown cron failure';
    console.error('[Cron] Daily run failed:', errorMsg);
    return NextResponse.json(
      {
        status: 'error',
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
