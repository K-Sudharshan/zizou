import { describe, it, expect } from 'vitest';
import {
  IssueSchema,
  validateAndReconcileStoryUrls,
  estimateWordCount,
} from '@/lib/schema';
import { SAMPLE_ISSUE } from '@/lib/sample-issue';

describe('Schema & URL Validation', () => {
  it('validates a compliant Issue schema successfully', () => {
    const parseResult = IssueSchema.safeParse(SAMPLE_ISSUE);
    expect(parseResult.success).toBe(true);
  });

  it('rejects an issue with fewer than 4 stories', () => {
    const invalidIssue = {
      ...SAMPLE_ISSUE,
      stories: SAMPLE_ISSUE.stories.slice(0, 2),
    };
    const parseResult = IssueSchema.safeParse(invalidIssue);
    expect(parseResult.success).toBe(false);
  });

  it('rejects an issue with non-HTTPS URLs', () => {
    const invalidIssue = {
      ...SAMPLE_ISSUE,
      stories: [
        {
          ...SAMPLE_ISSUE.stories[0],
          sourceUrl: 'http://insecure.com/news',
        },
        ...SAMPLE_ISSUE.stories.slice(1),
      ],
    };
    const parseResult = IssueSchema.safeParse(invalidIssue);
    expect(parseResult.success).toBe(false);
  });

  it('detects and rejects model-fabricated URLs not in candidate feed list', () => {
    const candidateUrls = [
      'https://blog.research.google/2026/10/on-device-multimodal-reasoning.html',
      'https://huggingface.co/blog/code-agents-benchmark',
      'https://openai.com/index/structured-outputs-api-guarantees',
      'https://github.blog/ai-and-ml/github-copilot/copilot-workspace-dependency-analysis',
    ];

    const issueWithFakeUrl = {
      ...SAMPLE_ISSUE,
      stories: [
        ...SAMPLE_ISSUE.stories.slice(0, 4),
        {
          title: 'Fabricated Story',
          section: 'AI',
          sourceName: 'Fake Source',
          sourceUrl: 'https://fake-news-site.org/hallucinated-story',
          whatHappened: 'Model made this up.',
          whyItMatters: 'It matters because hallucination is bad.',
          nextStep: 'Check the real source.',
        },
      ],
    };

    const { validatedIssue, invalidUrls } = validateAndReconcileStoryUrls(
      issueWithFakeUrl,
      candidateUrls
    );

    expect(invalidUrls).toContain('https://fake-news-site.org/hallucinated-story');
    expect(
      validatedIssue.stories.find(
        (s) => s.sourceUrl === 'https://fake-news-site.org/hallucinated-story'
      )
    ).toBeUndefined();
  });

  it('estimates word count accurately', () => {
    const count = estimateWordCount(SAMPLE_ISSUE);
    expect(count).toBeGreaterThan(300);
    expect(count).toBeLessThan(900);
  });
});
