import { describe, it, expect, vi } from 'vitest';
import {
  stripHtml,
  normalizeUrl,
  collectFeedStories,
  isFeedEndpointUrl,
  DEFAULT_FEEDS,
} from '@/lib/feeds';

describe('Feeds Collector', () => {
  it('strips HTML tags and decodes common entities', () => {
    const dirty =
      '<p>OpenAI &amp; Google announced a <strong>breakthrough</strong> in &quot;AI&quot; models &lt;2026&gt;.</p>';
    const cleaned = stripHtml(dirty);
    expect(cleaned).toBe(
      'OpenAI & Google announced a breakthrough in "AI" models <2026>.'
    );
  });

  it('normalizes URLs to https and strips tracking params', () => {
    const urlWithTracking =
      'http://techcrunch.com/article?utm_source=twitter&utm_medium=social&ref=feed#anchor';
    const normalized = normalizeUrl(urlWithTracking);
    expect(normalized).toBe('https://techcrunch.com/article');
  });

  it('rejects invalid or non-http protocols', () => {
    expect(normalizeUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeUrl('data:text/html,bad')).toBeNull();
    expect(normalizeUrl('not-a-url')).toBeNull();
  });

  it('identifies RSS/Atom feed endpoints to prevent them from becoming article links', () => {
    expect(isFeedEndpointUrl('https://openai.com/news/rss.xml')).toBe(true);
    expect(isFeedEndpointUrl('https://huggingface.co/blog/feed.xml')).toBe(true);
    expect(isFeedEndpointUrl('https://blog.research.google/feeds/posts/default?alt=rss')).toBe(true);
    expect(isFeedEndpointUrl('https://github.blog/feed/')).toBe(true);
    expect(isFeedEndpointUrl('https://techcrunch.com/category/artificial-intelligence/feed/')).toBe(true);
    // Real article URLs should return false
    expect(isFeedEndpointUrl('https://openai.com/index/structured-outputs-api-guarantees')).toBe(false);
    expect(isFeedEndpointUrl('https://blog.research.google/2026/10/multimodal.html')).toBe(false);
  });

  it('deduplicates stories and isolates failures per feed', async () => {
    // Mock global fetch for two feeds: one succeeds with duplicate entries, one fails
    const mockXmlSuccess = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <title>Test Feed 1</title>
          <item>
            <title>Story A</title>
            <link>https://example.com/story-a?utm_source=rss</link>
            <pubDate>${new Date().toUTCString()}</pubDate>
            <description>Summary of story A</description>
          </item>
          <item>
            <title>Story A Duplicate</title>
            <link>https://example.com/story-a</link>
            <pubDate>${new Date().toUTCString()}</pubDate>
            <description>Duplicate summary</description>
          </item>
          <item>
            <title>Story B</title>
            <link>https://example.com/story-b</link>
            <pubDate>${new Date().toUTCString()}</pubDate>
            <description>Summary of story B</description>
          </item>
        </channel>
      </rss>`;

    const customFeeds = [
      { name: 'Feed Success', url: 'https://feed1.com/rss', category: 'ai' as const },
      { name: 'Feed Failing', url: 'https://feed2.com/broken', category: 'ai' as const },
    ];

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      if (url.toString().includes('feed1')) {
        return new Response(mockXmlSuccess, { status: 200, headers: { 'Content-Type': 'application/xml' } });
      }
      return new Response('Internal Server Error', { status: 500 });
    });

    const result = await collectFeedStories(customFeeds, 7);

    // One feed succeeded, one failed, but the overall collection succeeded
    expect(result.feedStatuses.find((f) => f.name === 'Feed Success')?.success).toBe(true);
    expect(result.feedStatuses.find((f) => f.name === 'Feed Failing')?.success).toBe(false);

    // Duplicate story A was deduplicated
    expect(result.items.length).toBe(2);
    expect(result.items.map((i) => i.title)).toEqual(['Story A', 'Story B']);

    fetchSpy.mockRestore();
  });
});
