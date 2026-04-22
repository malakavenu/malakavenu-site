import { SITE } from '@/lib/site';
import { getAllArticles, type ArticleMeta } from '@/lib/articles';

// Generate at build time and refresh hourly; never cold-invoke at request time.
export const dynamic = 'force-static';
export const revalidate = 3600;

function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderItem(a: ArticleMeta): string {
  const url = `${SITE.url}/articles/${a.slug}`;
  return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(a.date).toUTCString()}</pubDate>
      <description>${escapeXml(a.description)}</description>
      ${a.tags?.map((t) => `<category>${escapeXml(t)}</category>`).join('\n      ') ?? ''}
    </item>`;
}

export async function GET() {
  // Swallow article-parse failures so the RSS feed never 500s — serving a
  // minimal valid feed is better than breaking podcast/reader integrations.
  let articles: ArticleMeta[] = [];
  try {
    articles = await getAllArticles();
  } catch (err) {
    console.error('[rss] failed to enumerate articles', err);
  }

  const lastBuild =
    articles[0]?.updated ?? articles[0]?.date ?? new Date().toISOString();
  const items = articles.map(renderItem).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE.name)} — Writing</title>
    <link>${SITE.url}/articles</link>
    <atom:link href="${SITE.url}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Patterns, post-mortems, and field notes on agent skills, subagents, MCP, and the frontend platform underneath them.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date(lastBuild).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
