import { NextRequest, NextResponse } from 'next/server';
import { generateIssuePdf } from '@/lib/pdf';
import { buildDailyIssue } from '@/lib/orchestrator';
import { IssueSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const forceMock = req.nextUrl.searchParams.get('mock') === 'true';
    const download = req.nextUrl.searchParams.get('download') === 'true';

    const result = await buildDailyIssue({
      isPreview: true,
      forceMock,
    });

    const filename = `daily-signal-${result.issue.editionDate}.pdf`;
    const disposition = download
      ? `attachment; filename="${filename}"`
      : `inline; filename="${filename}"`;

    return new NextResponse(result.pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to generate PDF';
    console.error('[PDF] Generation error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = IssueSchema.safeParse(body.issue || body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid issue payload for PDF generation.' },
        { status: 400 }
      );
    }

    const pdfBuffer = await generateIssuePdf(parsed.data);
    const filename = `daily-signal-${parsed.data.editionDate}.pdf`;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to generate PDF';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
