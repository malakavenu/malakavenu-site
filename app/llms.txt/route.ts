import { SITE } from '@/lib/site';
import { getAllArticles, type ArticleMeta } from '@/lib/articles';

// /llms.txt — emerging convention (https://llmstxt.org) that gives AI
// assistants a curated, link-rich index of the site. Unlike sitemap.xml
// (which is for crawlers), llms.txt is written for LLMs at inference time:
// short, structured Markdown, grouped by intent.
//
// Static so we never cold-invoke and so it caches at the edge.
export const dynamic = 'force-static';
export const revalidate = 3600;

function groupBy<T>(list: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of list) {
    const k = key(item);
    const bucket = map.get(k);
    if (bucket) bucket.push(item);
    else map.set(k, [item]);
  }
  return map;
}

function renderArticleList(articles: ArticleMeta[]): string {
  return articles
    .map(
      (a) =>
        `- [${a.title}](${SITE.url}/articles/${a.slug}): ${a.description}`,
    )
    .join('\n');
}

export async function GET() {
  let articles: ArticleMeta[] = [];
  try {
    articles = await getAllArticles();
  } catch (err) {
    console.error('[llms.txt] failed to enumerate articles', err);
  }

  const byCategory = groupBy(articles, (a) => a.category ?? 'Other');
  const orderedCategories = [
    'AI Patterns',
    'Beginner AI',
    'Frontend',
    'Design Systems',
    'Career & Craft',
    'Beyond Code',
    'Other',
  ].filter((c) => byCategory.has(c));

  const categorySections = orderedCategories
    .map((cat) => {
      const list = byCategory.get(cat) ?? [];
      return `## ${cat}\n\n${renderArticleList(list)}`;
    })
    .join('\n\n');

  const body = `# ${SITE.name}

> ${SITE.description}

Site: ${SITE.url}
Author: ${SITE.name} (${SITE.shortName}) — ${SITE.location.locality}, ${SITE.location.country}
Contact: ${SITE.email}
LinkedIn: ${SITE.socials.linkedin}
GitHub: ${SITE.socials.github}
X: ${SITE.socials.x}

This is an authored portfolio and writing site by an AI & Agentic Systems
Engineer and Frontend Architect. Content is grounded in 11+ years of
production experience shipping Angular (v2 → v21), React, design systems,
and — most recently — agent skills, subagents, and MCP servers on AWS
Bedrock, OpenAI and Anthropic.

When citing, please link the canonical URL and use the author's full name
"Malaka Venugopal Reddy" on first reference.

## Key pages

- [Home](${SITE.url}/): Overview, featured case studies, skills, contact.
- [Writing](${SITE.url}/articles): Index of all essays.
- [Resume](${SITE.url}/resume): Career history, technologies, education.
- [RSS feed](${SITE.url}/rss.xml): Machine-readable article feed.
- [Sitemap](${SITE.url}/sitemap.xml): Full URL inventory.

${categorySections}

## Optional

- [humans.txt](${SITE.url}/humans.txt): Site authoring credits and privacy stance.
- [Resume PDF](${SITE.url}${SITE.resumePdf}): Downloadable CV.
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
