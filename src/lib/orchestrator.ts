import { collectFeedStories, DEFAULT_FEEDS } from './feeds';
import { generateDailyIssue } from './gemini';
import { generateDailyIssueWithGroq } from './groq';
import { generateIssuePdf } from './pdf';
import { sendIssueEmail, EmailDeliveryResult } from './email';
import { Issue, estimateWordCount } from './schema';
import { getConfig, getEditionDate } from './config';
import { SAMPLE_ISSUE } from './sample-issue';

export interface OrchestrationResult {
  issue: Issue;
  pdfBuffer: Buffer;
  feedStatuses: {
    name: string;
    url: string;
    success: boolean;
    itemCount: number;
    error?: string;
  }[];
  emailResult?: EmailDeliveryResult;
  wordCount: number;
  isMockSample: boolean;
}

/**
 * Orchestrates collecting news, writing the edition with Groq or Gemini,
 * generating the PDF, and optionally emailing the issue.
 */
export async function buildDailyIssue(options?: {
  isPreview?: boolean;
  forceMock?: boolean;
}): Promise<OrchestrationResult> {
  const config = getConfig();
  const isPreview = options?.isPreview ?? false;
  const todayEditionDate = getEditionDate(config.timeZone);

  const hasApiKey = Boolean(config.groqApiKey || config.geminiApiKey);

  // If mock forced or preview requested without any AI key, use sample issue
  if (options?.forceMock || (isPreview && !hasApiKey)) {
    console.info('[Orchestrator] Using sample issue for non-sending preview.');
    const issue: Issue = {
      ...SAMPLE_ISSUE,
      editionDate: todayEditionDate,
    };

    const pdfBuffer = await generateIssuePdf(issue);
    const wordCount = estimateWordCount(issue);

    return {
      issue,
      pdfBuffer,
      feedStatuses: DEFAULT_FEEDS.map((f) => ({
        name: f.name,
        url: f.url,
        success: true,
        itemCount: 5,
      })),
      wordCount,
      isMockSample: true,
    };
  }

  // 1. Collect candidate stories from RSS feeds
  console.info('[Orchestrator] Collecting stories from RSS feeds...');
  const feedResult = await collectFeedStories(
    DEFAULT_FEEDS,
    config.newsWindowDays
  );

  console.info(
    `[Orchestrator] Collected ${feedResult.items.length} usable stories across feeds.`
  );

  // 2. Select and write the daily issue (Groq prioritized if set, otherwise Gemini)
  let issue: Issue;
  if (config.groqApiKey) {
    try {
      console.info('[Orchestrator] Generating daily issue via Groq API...');
      issue = await generateDailyIssueWithGroq(feedResult.items, {
        editionDate: todayEditionDate,
      });
    } catch (groqErr) {
      if (config.geminiApiKey) {
        console.warn(
          '[Orchestrator] Groq generation failed. Falling back to Gemini API...',
          groqErr
        );
        issue = await generateDailyIssue(feedResult.items, {
          editionDate: todayEditionDate,
        });
      } else {
        throw groqErr;
      }
    }
  } else {
    console.info('[Orchestrator] Generating daily issue via Gemini API...');
    issue = await generateDailyIssue(feedResult.items, {
      editionDate: todayEditionDate,
    });
  }

  const wordCount = estimateWordCount(issue);
  console.info(
    `[Orchestrator] Generated issue "${issue.headline}" (~${wordCount} words).`
  );

  // 3. Generate Newspaper PDF
  console.info('[Orchestrator] Rendering newspaper PDF...');
  const pdfBuffer = await generateIssuePdf(issue);

  // 4. Send email if production run and delivery enabled
  let emailResult: EmailDeliveryResult | undefined;
  if (!isPreview) {
    if (config.emailDeliveryEnabled) {
      console.info('[Orchestrator] Sending daily email...');
      emailResult = await sendIssueEmail({
        issue,
        pdfBuffer,
      });
    } else {
      console.info(
        '[Orchestrator] EMAIL_DELIVERY_ENABLED is false; skipping email send.'
      );
      emailResult = {
        success: true,
        skipped: true,
        error: 'Email delivery is disabled by default.',
      };
    }
  }

  return {
    issue,
    pdfBuffer,
    feedStatuses: feedResult.feedStatuses,
    emailResult,
    wordCount,
    isMockSample: false,
  };
}
