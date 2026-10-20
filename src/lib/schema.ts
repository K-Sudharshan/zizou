import { z } from 'zod';

export const StorySchema = z.object({
  title: z.string().min(5).max(180),
  section: z.string().min(2).max(60),
  sourceName: z.string().min(2).max(80),
  sourceUrl: z
    .string()
    .url()
    .refine((url) => url.startsWith('https://'), {
      message: 'Source URL must use https:// protocol',
    }),
  whatHappened: z.string().min(20).max(600),
  whyItMatters: z.string().min(20).max(600),
  nextStep: z.string().min(10).max(400),
});

export type Story = z.infer<typeof StorySchema>;

export const NextMoveSchema = z.object({
  action: z.string().min(10).max(300),
  category: z.enum(['learning', 'project', 'career', 'open-source']).default('learning'),
  isVerifiedOpportunity: z.boolean().default(false),
});

export type NextMove = z.infer<typeof NextMoveSchema>;

export const GlossaryItemSchema = z.object({
  term: z.string().min(2).max(60),
  definition: z.string().min(10).max(250),
});

export type GlossaryItem = z.infer<typeof GlossaryItemSchema>;

export const IssueSchema = z.object({
  editionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  headline: z.string().min(10).max(160),
  summary: z.string().min(30).max(600),
  readingTimeMinutes: z.number().int().min(3).max(10).default(5),
  stories: z.array(StorySchema).min(4).max(10),
  nextMoves: z.array(NextMoveSchema).min(1).max(5),
  glossary: z.array(GlossaryItemSchema).min(2).max(6),
});

export type Issue = z.infer<typeof IssueSchema>;

export interface RawFeedItem {
  title: string;
  url: string;
  sourceName: string;
  publishedAt: Date;
  excerpt: string;
}

export interface FeedFetchResult {
  items: RawFeedItem[];
  feedStatuses: {
    name: string;
    url: string;
    success: boolean;
    itemCount: number;
    error?: string;
  }[];
}

/**
 * Validates generated story URLs against candidate feed URLs.
 * Reconciles minor URL variations (e.g. trailing slashes, tracking params)
 * or rejects stories with fabricated source URLs.
 */
export function validateAndReconcileStoryUrls(
  issue: Issue,
  candidateUrls: string[]
): { validatedIssue: Issue; invalidUrls: string[] } {
  const normalizeUrl = (u: string) => {
    try {
      const parsed = new URL(u);
      parsed.search = '';
      parsed.hash = '';
      return parsed.toString().replace(/\/$/, '').toLowerCase();
    } catch {
      return u.trim().replace(/\/$/, '').toLowerCase();
    }
  };

  const candidateMap = new Map<string, string>();
  for (const rawUrl of candidateUrls) {
    candidateMap.set(normalizeUrl(rawUrl), rawUrl);
  }

  const invalidUrls: string[] = [];
  const reconciledStories: Story[] = [];

  for (const story of issue.stories) {
    const normalizedStoryUrl = normalizeUrl(story.sourceUrl);
    const matchedOriginalUrl = candidateMap.get(normalizedStoryUrl);

    if (matchedOriginalUrl) {
      reconciledStories.push({
        ...story,
        sourceUrl: matchedOriginalUrl,
      });
    } else {
      // Check if story.sourceUrl exactly starts with one of candidate URLs or vice-versa
      let matched = false;
      for (const [normCand, origCand] of candidateMap.entries()) {
        if (
          normalizedStoryUrl.startsWith(normCand) ||
          normCand.startsWith(normalizedStoryUrl)
        ) {
          reconciledStories.push({
            ...story,
            sourceUrl: origCand,
          });
          matched = true;
          break;
        }
      }
      if (!matched) {
        invalidUrls.push(story.sourceUrl);
      }
    }
  }

  return {
    validatedIssue: {
      ...issue,
      stories: reconciledStories,
    },
    invalidUrls,
  };
}

/**
 * Calculates rough total word count of the issue (excluding URLs and metadata).
 */
export function estimateWordCount(issue: Issue): number {
  let text = `${issue.headline} ${issue.summary} `;
  for (const story of issue.stories) {
    text += `${story.title} ${story.whatHappened} ${story.whyItMatters} ${story.nextStep} `;
  }
  for (const move of issue.nextMoves) {
    text += `${move.action} `;
  }
  for (const item of issue.glossary) {
    text += `${item.term} ${item.definition} `;
  }

  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}
