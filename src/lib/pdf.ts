import PDFDocument from 'pdfkit';
import { Issue } from './schema';
import { formatDisplayDate } from './config';

/**
 * Generates a polished, minimalist editorial newspaper PDF using PDFKit.
 * Optimized for comfortable reading on an iPhone and clean printing on A4.
 */
export async function generateIssuePdf(issue: Issue): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      // A4: 595.28 x 841.89 points
      const leftMargin = 48;
      const rightMargin = 48;
      const topMargin = 40;
      const bottomMargin = 50;
      const contentWidth = 595.28 - leftMargin - rightMargin; // 499.28 pt
      const pageHeight = 841.89;
      const maxY = pageHeight - bottomMargin; // 791.89 pt

      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: topMargin,
          bottom: bottomMargin,
          left: leftMargin,
          right: rightMargin,
        },
        bufferPages: true,
        info: {
          Title: `Zizou - ${issue.editionDate}`,
          Author: 'Zizou',
          Subject: issue.headline,
          Keywords: 'AI, Machine Learning, Technology News, Computer Science',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const displayDate = formatDisplayDate(issue.editionDate);

      // Helper: draws the running header on pages after page 1
      const drawRunningHeader = () => {
        doc.font('Helvetica').fontSize(7.5).fillColor('#6b7280');
        const headerY = topMargin;
        doc.text(
          `ZIZOU  |  ${displayDate.toUpperCase()}`,
          leftMargin,
          headerY,
          {
            width: contentWidth,
            align: 'left',
            lineBreak: false,
          }
        );
        doc.text(
          'MORNING INTELLIGENCE BRIEF',
          leftMargin,
          headerY,
          {
            width: contentWidth,
            align: 'right',
            lineBreak: false,
          }
        );
        doc.strokeColor('#d1d5db').lineWidth(0.5);
        doc
          .moveTo(leftMargin, headerY + 12)
          .lineTo(leftMargin + contentWidth, headerY + 12)
          .stroke();
        doc.x = leftMargin;
        doc.y = headerY + 22;
      };

      // Helper: Check if adding an element of neededHeight would overflow past maxY
      const ensureSpace = (neededHeight: number) => {
        if (doc.y + neededHeight > maxY) {
          doc.addPage();
          drawRunningHeader();
        }
      };

      // ==================== MASTHEAD (Page 1) ====================
      doc.x = leftMargin;
      doc.y = topMargin;

      // Top decorative rule
      doc.strokeColor('#111827').lineWidth(1.2);
      doc
        .moveTo(leftMargin, doc.y)
        .lineTo(leftMargin + contentWidth, doc.y)
        .stroke();
      doc.moveDown(0.25);

      // Main Newspaper Title
      doc.x = leftMargin;
      doc
        .font('Times-Bold')
        .fontSize(28)
        .fillColor('#111827')
        .text('ZIZOU', leftMargin, doc.y, {
          width: contentWidth,
          align: 'center',
          characterSpacing: 2.5,
        });

      // Subtitle
      doc.x = leftMargin;
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#4b5563')
        .text(
          'THE MORNING INTELLIGENCE BRIEF FOR EARLY-CAREER AI & SOFTWARE ENGINEERS',
          leftMargin,
          doc.y + 2,
          {
            width: contentWidth,
            align: 'center',
            characterSpacing: 0.8,
          }
        );

      doc.y = doc.y + 12;
      doc.strokeColor('#9ca3af').lineWidth(0.5);
      doc
        .moveTo(leftMargin, doc.y)
        .lineTo(leftMargin + contentWidth, doc.y)
        .stroke();
      doc.y = doc.y + 4;

      // Metadata Bar
      const metaY = doc.y;
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#111827')
        .text(displayDate.toUpperCase(), leftMargin, metaY, {
          width: contentWidth / 2,
          align: 'left',
          lineBreak: false,
        });

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#4b5563')
        .text(
          `Reading Time: ~${issue.readingTimeMinutes} mins   |   Edition: India (08:00 IST)`,
          leftMargin + contentWidth / 2,
          metaY,
          {
            width: contentWidth / 2,
            align: 'right',
            lineBreak: false,
          }
        );

      doc.y = metaY + 12;
      doc.strokeColor('#111827').lineWidth(1.2);
      doc
        .moveTo(leftMargin, doc.y)
        .lineTo(leftMargin + contentWidth, doc.y)
        .stroke();
      doc.y = doc.y + 12;

      // ==================== LEAD HEADLINE & SUMMARY ====================
      doc.x = leftMargin;
      doc
        .font('Times-Bold')
        .fontSize(16.5)
        .fillColor('#111827')
        .text(issue.headline, leftMargin, doc.y, {
          width: contentWidth,
          lineGap: 2.5,
        });

      doc.x = leftMargin;
      doc.y = doc.y + 4;
      doc
        .font('Times-Italic')
        .fontSize(9.5)
        .fillColor('#374151')
        .text(issue.summary, leftMargin, doc.y, {
          width: contentWidth,
          lineGap: 2.5,
        });

      doc.y = doc.y + 8;
      doc.strokeColor('#d1d5db').lineWidth(0.5);
      doc
        .moveTo(leftMargin, doc.y)
        .lineTo(leftMargin + contentWidth, doc.y)
        .stroke();
      doc.y = doc.y + 10;

      // ==================== STORIES ====================
      for (let i = 0; i < issue.stories.length; i++) {
        const story = issue.stories[i];

        // Ensure room for section label, title, and first body line
        ensureSpace(95);

        doc.x = leftMargin;

        // Section badge & attribution
        doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor('#1e40af')
          .text(story.section.toUpperCase(), leftMargin, doc.y, {
            continued: true,
          })
          .font('Helvetica')
          .fillColor('#6b7280')
          .text(`   |   ${story.sourceName}`, {
            continued: false,
          });

        doc.x = leftMargin;
        doc.y = doc.y + 3;

        // Story Title
        doc
          .font('Times-Bold')
          .fontSize(12)
          .fillColor('#111827')
          .text(story.title, leftMargin, doc.y, {
            width: contentWidth,
            lineGap: 2,
          });

        doc.x = leftMargin;
        doc.y = doc.y + 3;

        // What happened
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor('#1f2937')
          .text('What happened: ', leftMargin, doc.y, { continued: true })
          .font('Times-Roman')
          .fontSize(9)
          .fillColor('#1f2937')
          .text(story.whatHappened, {
            lineGap: 2,
            width: contentWidth,
          });

        doc.x = leftMargin;
        doc.y = doc.y + 3;

        // Why it matters
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor('#1f2937')
          .text('Why it matters: ', leftMargin, doc.y, { continued: true })
          .font('Times-Roman')
          .fontSize(9)
          .fillColor('#1f2937')
          .text(story.whyItMatters, {
            lineGap: 2,
            width: contentWidth,
          });

        doc.x = leftMargin;
        doc.y = doc.y + 3;

        // Next step
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor('#065f46')
          .text('Practical next step: ', leftMargin, doc.y, { continued: true })
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor('#065f46')
          .text(story.nextStep, {
            lineGap: 1.8,
            width: contentWidth,
          });

        doc.x = leftMargin;
        doc.y = doc.y + 3;

        // Clickable Source Link
        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor('#1d4ed8')
          .text(`Source article: ${story.sourceUrl}`, leftMargin, doc.y, {
            link: story.sourceUrl,
            underline: true,
            lineBreak: true,
            width: contentWidth,
          });

        doc.x = leftMargin;
        doc.y = doc.y + 8;

        // Separator line between stories
        if (i < issue.stories.length - 1) {
          doc.strokeColor('#f3f4f6').lineWidth(0.5);
          doc
            .moveTo(leftMargin, doc.y)
            .lineTo(leftMargin + contentWidth, doc.y)
            .stroke();
          doc.y = doc.y + 8;
        }
      }

      // ==================== "YOUR NEXT MOVE" SECTION ====================
      if (issue.nextMoves && issue.nextMoves.length > 0) {
        ensureSpace(70);

        doc.x = leftMargin;
        doc.y = doc.y + 12;
        doc.strokeColor('#111827').lineWidth(0.8);
        doc
          .moveTo(leftMargin, doc.y)
          .lineTo(leftMargin + contentWidth, doc.y)
          .stroke();
        doc.y = doc.y + 8;

        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor('#111827')
          .text('YOUR NEXT MOVE  |  PRACTICAL ACTION ITEMS', leftMargin, doc.y, {
            characterSpacing: 0.8,
          });

        doc.y = doc.y + 6;

        for (const move of issue.nextMoves) {
          ensureSpace(24);
          doc.x = leftMargin;
          const tag = `[${move.category.toUpperCase()}${move.isVerifiedOpportunity ? ' - VERIFIED' : ' - ADVICE'}] `;
          doc
            .font('Helvetica-Bold')
            .fontSize(7.5)
            .fillColor(move.isVerifiedOpportunity ? '#047857' : '#4b5563')
            .text(tag, leftMargin, doc.y, { continued: true })
            .font('Helvetica')
            .fontSize(8)
            .fillColor('#1f2937')
            .text(move.action, {
              lineGap: 1.8,
              width: contentWidth,
            });
          doc.y = doc.y + 4;
        }
      }

      // ==================== "DAILY GLOSSARY" SECTION ====================
      if (issue.glossary && issue.glossary.length > 0) {
        ensureSpace(60);

        doc.x = leftMargin;
        doc.y = doc.y + 10;
        doc.strokeColor('#9ca3af').lineWidth(0.5);
        doc
          .moveTo(leftMargin, doc.y)
          .lineTo(leftMargin + contentWidth, doc.y)
          .stroke();
        doc.y = doc.y + 8;

        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor('#111827')
          .text('DAILY GLOSSARY  |  KEY CONCEPTS EXPLAINED', leftMargin, doc.y, {
            characterSpacing: 0.8,
          });

        doc.y = doc.y + 5;

        for (const item of issue.glossary) {
          ensureSpace(22);
          doc.x = leftMargin;
          doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor('#111827')
            .text(`${item.term}: `, leftMargin, doc.y, { continued: true })
            .font('Times-Roman')
            .fontSize(8.5)
            .fillColor('#374151')
            .text(item.definition, {
              lineGap: 1.8,
              width: contentWidth,
            });
          doc.y = doc.y + 2;
        }
      }

      // ==================== RUNNING FOOTERS ON ACTUAL PAGES ====================
      // Crucial: Set page bottom margin to 0 during footer rendering so PDFKit never auto-adds blank pages!
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);

        const oldBottomMargin = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;

        const footerY = pageHeight - 34;

        // Thin divider line above footer
        doc.strokeColor('#e5e7eb').lineWidth(0.5);
        doc
          .moveTo(leftMargin, footerY - 5)
          .lineTo(leftMargin + contentWidth, footerY - 5)
          .stroke();

        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor('#6b7280')
          .text(
            `Zizou  |  Page ${i + 1} of ${totalPages}  |  Clickable Source Articles Included  |  https://zizou.app`,
            leftMargin,
            footerY,
            {
              width: contentWidth,
              align: 'center',
              lineBreak: false,
            }
          );

        doc.page.margins.bottom = oldBottomMargin;
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
