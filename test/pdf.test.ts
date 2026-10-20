import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { generateIssuePdf } from '@/lib/pdf';
import { SAMPLE_ISSUE } from '@/lib/sample-issue';

describe('PDF Generator', () => {
  it('generates a valid, compact 2-page minimalist editorial PDF with clickable article links', async () => {
    const pdfBuffer = await generateIssuePdf(SAMPLE_ISSUE);

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    // Standard PDF header signature check: %PDF-
    const header = pdfBuffer.slice(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');

    const pdfString = pdfBuffer.toString('latin1');

    // Document metadata check
    expect(pdfString).toContain('Zizou');
    expect(pdfString).toContain(SAMPLE_ISSUE.editionDate);
    expect(pdfString).toContain('/Annots');

    // Page count check: Must be <= 3 pages (specifically 2 pages for standard issue)
    const pageCountMatch = pdfString.match(/\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)/);
    expect(pageCountMatch).not.toBeNull();
    const pageCount = parseInt(pageCountMatch![1], 10);
    expect(pageCount).toBeLessThanOrEqual(3);
    expect(pageCount).toBe(2);

    // Verify source links: Ensure no RSS feed endpoints appear as article links
    for (const story of SAMPLE_ISSUE.stories) {
      expect(story.sourceUrl).not.toContain('.xml');
      expect(story.sourceUrl).not.toContain('/feed');
      expect(story.sourceUrl.startsWith('https://')).toBe(true);
      expect(pdfString).toContain(story.sourceUrl);
    }

    // Save sample PDF to disk for manual inspection
    const outPath = path.resolve(__dirname, '../public/sample-preview.pdf');
    fs.writeFileSync(outPath, pdfBuffer);
    expect(fs.existsSync(outPath)).toBe(true);
  });
});
