import { GoogleGenAI, Type } from '@google/genai';
import {
  Issue,
  IssueSchema,
  RawFeedItem,
  validateAndReconcileStoryUrls,
} from './schema';
import { getConfig, getEditionDate } from './config';

/**
 * Builds the editorial issue using Gemini structured outputs.
 */
export async function generateDailyIssue(
  candidateStories: RawFeedItem[],
  options?: {
    apiKey?: string;
    model?: string;
    readerGoals?: string;
    editionDate?: string;
  }
): Promise<Issue> {
  const config = getConfig();
  const apiKey = options?.apiKey || config.geminiApiKey;
  const modelName = options?.model || config.geminiModel;
  const readerGoals = options?.readerGoals || config.readerGoals;
  const editionDate = options?.editionDate || getEditionDate(config.timeZone);

  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set. Please provide a valid Gemini API key in your environment.'
    );
  }

  if (candidateStories.length < 4) {
    throw new Error(
      `Insufficient news coverage: found ${candidateStories.length} stories, but at least 4 are required.`
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  // Prepare candidate stories string with exact URLs
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

  const prompt = `You are the lead editor and writer for "The Daily Signal", an AI Daily Tech Newspaper tailored specifically for:
"${readerGoals}"

Edition Date: ${editionDate}

Below is the verified list of candidate news stories fetched from real RSS feeds:
=========================================
${storiesSummary}
=========================================

YOUR EDITORIAL RESPONSIBILITIES:
1. Select 5 to 7 high-impact, relevant stories from the list above.
   - Prioritize AI/ML breakthroughs, developer tools, open-source projects, and foundational computing insights.
   - Include 1 important world or general tech story if available in the candidate stories.
2. For EVERY story:
   - "title": Clear, engaging, short headline (do not sensationalize).
   - "section": e.g. "AI & Machine Learning", "Developer Tools", "Open Source & Systems", "World Tech Brief".
   - "sourceName": Exact source name from the candidate story.
   - "sourceUrl": You MUST copy the EXACT canonical article "URL" from the candidate story. NEVER fabricate or alter URLs, and NEVER use a feed endpoint ending in .xml, /feed, or /rss.
   - "whatHappened": 1-2 plain English sentences explaining what was built, released, or discovered.
   - "whyItMatters": 1-2 plain English sentences explaining why a first-year CS student should care.
   - "nextStep": 1 practical suggestion for what the student can test, read, or explore.
3. Write a cohesive, newspaper-style "headline" for today's entire edition, and a 2-sentence "summary" introducing today's paper.
4. "nextMoves": Provide 1 to 3 practical, actionable next steps for a student reader today.
   - If an opportunity is not explicitly source-verified with dates, set isVerifiedOpportunity: false and give general learning/project advice.
5. "glossary": Provide 2 to 4 technical terms appearing in today's stories, defined in a single, simple, accessible sentence.
6. Target overall reading time of ~5 minutes, with total text between 550 and 700 words.
7. Plain English: Avoid unnecessary jargon. Write clearly and concisely.
8. NEVER fabricate statistics, quotes, company statements, or URLs. Only use facts from the excerpts provided.`;

  const modelsToTry = [modelName];
  if (!modelsToTry.includes('gemini-3.7-flash')) modelsToTry.push('gemini-3.7-flash');
  if (!modelsToTry.includes('gemini-3.5-flash')) modelsToTry.push('gemini-3.5-flash');

  let responseText: string | undefined;
  let lastError: unknown;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              editionDate: { type: Type.STRING },
              headline: { type: Type.STRING },
              summary: { type: Type.STRING },
              readingTimeMinutes: { type: Type.INTEGER },
              stories: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    section: { type: Type.STRING },
                    sourceName: { type: Type.STRING },
                    sourceUrl: { type: Type.STRING },
                    whatHappened: { type: Type.STRING },
                    whyItMatters: { type: Type.STRING },
                    nextStep: { type: Type.STRING },
                  },
                  required: [
                    'title',
                    'section',
                    'sourceName',
                    'sourceUrl',
                    'whatHappened',
                    'whyItMatters',
                    'nextStep',
                  ],
                },
              },
              nextMoves: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    action: { type: Type.STRING },
                    category: {
                      type: Type.STRING,
                      enum: ['learning', 'project', 'career', 'open-source'],
                    },
                    isVerifiedOpportunity: { type: Type.BOOLEAN },
                  },
                  required: ['action', 'category', 'isVerifiedOpportunity'],
                },
              },
              glossary: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    term: { type: Type.STRING },
                    definition: { type: Type.STRING },
                  },
                  required: ['term', 'definition'],
                },
              },
            },
            required: [
              'editionDate',
              'headline',
              'summary',
              'readingTimeMinutes',
              'stories',
              'nextMoves',
              'glossary',
            ],
          },
        },
      });

      if (response.text) {
        responseText = response.text;
        break;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini] Model ${model} encountered an issue: ${err instanceof Error ? err.message : err}. Trying fallback model...`);
    }
  }

  if (!responseText) {
    throw new Error(
      `Gemini API generation failed across models: ${lastError instanceof Error ? lastError.message : 'Empty response'}`
    );
  }

  let parsedRaw: unknown;
  try {
    parsedRaw = JSON.parse(responseText);
  } catch (err) {
    throw new Error(
      `Failed to parse Gemini output as JSON: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }

  // Runtime validation with Zod
  const zodResult = IssueSchema.safeParse(parsedRaw);
  if (!zodResult.success) {
    throw new Error(
      `Gemini output failed schema validation: ${zodResult.error.message}`
    );
  }

  // Ensure editionDate is consistent
  const rawIssue = {
    ...zodResult.data,
    editionDate,
  };

  // Reconcile and validate URLs against fetched candidates
  const { validatedIssue, invalidUrls } = validateAndReconcileStoryUrls(
    rawIssue,
    candidateUrls
  );

  if (invalidUrls.length > 0) {
    console.warn(
      `[Gemini] Rejected ${invalidUrls.length} hallucinated or untracked source URLs:`,
      invalidUrls
    );
  }

  if (validatedIssue.stories.length < 4) {
    throw new Error(
      `After URL verification, only ${validatedIssue.stories.length} stories had valid source links (minimum 4 required).`
    );
  }

  return validatedIssue;
}
