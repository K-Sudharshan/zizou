import Parser from 'rss-parser';
import { RawFeedItem, FeedFetchResult } from './schema';

export interface FeedSource {
  name: string;
  url: string;
  category: 'ai' | 'tools' | 'general';
}

export const DEFAULT_FEEDS: FeedSource[] = [
  {
    name: 'OpenAI News',
    url: 'https://openai.com/news/rss.xml',
    category: 'ai',
  },
  {
    name: 'Google Research',
    url: 'https://blog.research.google/feeds/posts/default?alt=rss',
    category: 'ai',
  },
  {
    name: 'Hugging Face Blog',
    url: 'https://huggingface.co/blog/feed.xml',
    category: 'ai',
  },
  {
    name: 'GitHub Blog',
    url: 'https://github.blog/feed/',
    category: 'tools',
  },
  {
    name: 'TechCrunch AI',
    url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    category: 'ai',
  },
  {
    name: 'BBC Technology',
    url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    category: 'general',
  },
  {
    name: 'BBC World',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    category: 'general',
  },
];

const parser = new Parser({
  timeout: 8000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; DailySignalBot/1.0; +https://thedailysignal.app)',
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
  },
});

/**
 * Strips HTML tags and unescapes common HTML entities.
 */
export function stripHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a URL points to an RSS/Atom XML feed endpoint rather than an individual article page.
 */
export function isFeedEndpointUrl(url: string, sourceUrl?: string): boolean {
  try {
    const parsed = new URL(url.toLowerCase());
    if (sourceUrl) {
      const parsedSource = new URL(sourceUrl.toLowerCase());
      if (parsed.origin === parsedSource.origin && parsed.pathname === parsedSource.pathname) {
        return true;
      }
    }
    const path = parsed.pathname;
    if (path.endsWith('.xml') || path.endsWith('.rss') || path.endsWith('.atom')) {
      return true;
    }
    if (
      path.endsWith('/feed') ||
      path.endsWith('/feed/') ||
      path.endsWith('/rss') ||
      path.endsWith('/rss/')
    ) {
      return true;
    }
    if (parsed.searchParams.get('alt') === 'rss' || parsed.searchParams.get('format') === 'xml') {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

/**
 * Normalizes URLs to ensure https: and remove tracking query params.
 */
export function normalizeUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:') {
      // Force HTTPS if possible, or reject if insecure protocol
      if (parsed.protocol === 'http:') {
        parsed.protocol = 'https:';
      } else {
        return null;
      }
    }
    parsed.hash = '';
    // Remove UTM tracking and referral query parameters
    const paramsToDelete: string[] = [];
    parsed.searchParams.forEach((_, key) => {
      const lower = key.toLowerCase();
      if (
        lower.startsWith('utm_') ||
        lower === 'ref' ||
        lower === 'source' ||
        lower === 'fbclid' ||
        lower === 'gclid'
      ) {
        paramsToDelete.push(key);
      }
    });
    paramsToDelete.forEach((key) => parsed.searchParams.delete(key));

    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Fetches and parses a single feed with bounded timeout and safe error handling.
 */
export async function fetchSingleFeed(
  source: FeedSource,
  timeoutMs = 8000
): Promise<{ items: RawFeedItem[]; error?: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'DailySignalBot/1.0 (+https://thedailysignal.app)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
    });

    clearTimeout(timer);

    if (!response.ok) {
      return {
        items: [],
        error: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    const xml = await response.text();
    const feed = await parser.parseString(xml);

    const items: RawFeedItem[] = [];

    for (const entry of feed.items || []) {
      // Prefer explicit article link over guid
      let rawUrl = '';
      if (typeof entry.link === 'string' && entry.link.trim().startsWith('http')) {
        rawUrl = entry.link.trim();
      } else if (typeof entry.guid === 'string' && entry.guid.trim().startsWith('http')) {
        rawUrl = entry.guid.trim();
      }
      if (!rawUrl) continue;

      const url = normalizeUrl(rawUrl);
      if (!url || isFeedEndpointUrl(url, source.url)) continue;

      const title = stripHtml(entry.title || '').slice(0, 200);
      if (!title) continue;

      const content =
        entry.contentSnippet ||
        entry.content ||
        entry.summary ||
        entry['content:encoded'] ||
        '';
      const excerpt = stripHtml(content).slice(0, 500);

      const pubDate = entry.pubDate || entry.isoDate || entry.date;
      const publishedAt = pubDate ? new Date(pubDate) : new Date();

      items.push({
        title,
        url,
        sourceName: source.name,
        publishedAt: isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
        excerpt,
      });
    }

    return { items };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown feed error';
    return { items: [], error: message };
  }
}

/**
 * Fetches all feeds concurrently, filters by publication window, and deduplicates items.
 */
export async function collectFeedStories(
  feeds = DEFAULT_FEEDS,
  windowDays = 7,
  referenceDate = new Date()
): Promise<FeedFetchResult> {
  const feedPromises = feeds.map(async (source) => {
    const result = await fetchSingleFeed(source);
    return {
      name: source.name,
      url: source.url,
      success: !result.error,
      itemCount: result.items.length,
      error: result.error,
      items: result.items,
    };
  });

  const feedResults = await Promise.all(feedPromises);

  const feedStatuses = feedResults.map((r) => ({
    name: r.name,
    url: r.url,
    success: r.success,
    itemCount: r.itemCount,
    error: r.error,
  }));

  const allItems = feedResults.flatMap((r) => r.items);

  // Deduplicate by normalized URL
  const seenUrls = new Set<string>();
  const uniqueItems: RawFeedItem[] = [];

  for (const item of allItems) {
    const key = item.url.toLowerCase();
    if (!seenUrls.has(key)) {
      seenUrls.add(key);
      uniqueItems.push(item);
    }
  }

  // Filter by freshness window
  const cutoffTime = referenceDate.getTime() - windowDays * 24 * 60 * 60 * 1000;
  let filteredItems = uniqueItems.filter((i) => i.publishedAt.getTime() >= cutoffTime);

  // If fewer than 4 items, fallback up to 14 days
  if (filteredItems.length < 4 && windowDays < 14) {
    const fallbackCutoff = referenceDate.getTime() - 14 * 24 * 60 * 60 * 1000;
    filteredItems = uniqueItems.filter((i) => i.publishedAt.getTime() >= fallbackCutoff);
  }

  // Sort descending by date
  filteredItems.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

  return {
    items: filteredItems,
    feedStatuses,
  };
}
