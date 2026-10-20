import {
  Issue,
  IssueSchema,
  RawFeedItem,
  validateAndReconcileStoryUrls,
} from './schema';
import { getConfig, getEditionDate } from './config';

/**
 * Generates the daily newspaper issue using Groq's OpenAI-compatible API.
 * Uses zero extra dependencies (native fetch).
 */
export async function generateDailyIssueWithGroq(
  candidateStories: RawFeedItem[],
  options?: {
    apiKey?: string;
    model?: string;
    readerGoals?: string;
    editionDate?: string;
  }
): Promise<Issue> {
  const config = getConfig();
  const apiKey = options?.apiKey || config.groqApiKey;
  const modelName = options?.model || config.groqModel;
  const readerGoals = options?.readerGoals || config.readerGoals;
  const editionDate = options?.editionDate || getEditionDate(config.timeZone);

  if (!apiKey) {
    throw new Error(
      'GROQ_API_KEY is not set. Please provide a valid Groq API key in your environment.'
    );
  }

  if (candidateStories.length < 4) {
    throw new Error(
      `Insufficient news coverage: found ${candidateStories.length} stories, but at least 4 are required.`
    );
  }

  const candidateUrls = candidateStories.map((s) => s.url);
  const storiesSummary = candidateStories
    .slice(0, 25)
    .map(
      (s, index) =>
        `Story #${index + 1}:
Source: ${s.sourceName}
URL: ${s.url}
Published: ${s.publishedAt.toISOString().slice(0, 10)}
Title: ${s.title}
Excerpt: ${s.excerpt}`
    )
    .join('\n\n---\n\n');

  const systemPrompt = `You are the lead editor and writer for "The Daily Signal", an AI Daily Tech Newspaper tailored specifically for:
"${readerGoals}"

Edition Date: ${editionDate}

You must return a valid JSON object matching this exact schema:
{
  "editionDate": "YYYY-MM-DD",
  "headline": "A bold, cohesive newspaper headline for today's edition",
  "summary": "1-2 sentences summarizing today's overall tech landscape",
  "readingTimeMinutes": 5,
  "stories": [
    {
      "title": "Clear, short title",
      "section": "Section name (e.g. AI & Machine Learning, Developer Tools, Open Source)",
      "sourceName": "Exact publisher name",
      "sourceUrl": "EXACT canonical article URL from candidate story (MUST NOT be .xml or feed URL)",
      "whatHappened": "1-2 plain English sentences explaining the news",
      "whyItMatters": "1-2 plain English sentences explaining why a first-year CS student should care",
      "nextStep": "1 practical next step/exploration advice"
    }
  ],
  "nextMoves": [
    {
      "action": "Practical action item for a student today",
      "category": "learning" | "project" | "career" | "open-source",
      "isVerifiedOpportunity": false
    }
  ],
  "glossary": [
    {
      "term": "Technical concept name",
      "definition": "One simple, accessible definition sentence"
    }
  ]
}

CRITICAL RULES:
1. Select 5 to 7 high-impact stories.
2. "sourceUrl" MUST be copied exactly from the candidate story's URL. NEVER fabricate URLs or output feed endpoints ending in .xml or /rss.
3. Total reading time ~5 minutes (approx 550 to 700 words).
4. Provide 1 to 3 "nextMoves" and 2 to 4 "glossary" terms.`;

  const userPrompt = `Below are the verified candidate stories fetched from real feeds:
=========================================
${storiesSummary}
=========================================

Write today's complete edition as a JSON object adhering strictly to the required schema.`;

  const modelsToTry = [modelName];
  if (!modelsToTry.includes('openai/gpt-oss-120b')) modelsToTry.push('openai/gpt-oss-120b');
  if (!modelsToTry.includes('qwen/qwen3.8-27b')) modelsToTry.push('qwen/qwen3.8-27b');
  if (!modelsToTry.includes('openai/gpt-oss-20b')) modelsToTry.push('openai/gpt-oss-20b');

  let content: string | undefined;
  let lastError: unknown;

  for (const model of modelsToTry) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      content = data.choices?.[0]?.message?.content;
      if (content) break;
    } catch (err) {
      lastError = err;
      console.warn(`[Groq] Model ${model} failed: ${err instanceof Error ? err.message : err}. Trying fallback...`);
    }
  }

  if (!content) {
    throw new Error(
      `Groq API generation failed across models: ${lastError instanceof Error ? lastError.message : 'Empty response'}`
    );
  }

  let parsedRaw: unknown;
  try {
    parsedRaw = JSON.parse(content);
  } catch (err) {
    throw new Error(
      `Failed to parse Groq output as JSON: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }

  const zodResult = IssueSchema.safeParse(parsedRaw);
  if (!zodResult.success) {
    throw new Error(
      `Groq output failed schema validation: ${zodResult.error.message}`
    );
  }

  const rawIssue = {
    ...zodResult.data,
    editionDate,
  };

  const { validatedIssue, invalidUrls } = validateAndReconcileStoryUrls(
    rawIssue,
    candidateUrls
  );

  if (invalidUrls.length > 0) {
    console.warn(`[Groq] Filtered ${invalidUrls.length} untracked URLs:`, invalidUrls);
  }

  if (validatedIssue.stories.length < 4) {
    throw new Error(
      `After URL verification, only ${validatedIssue.stories.length} stories had valid source links (minimum 4 required).`
    );
  }

  return validatedIssue;
}
