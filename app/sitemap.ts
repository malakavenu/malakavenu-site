import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';
import { getAllArticles } from '@/lib/articles';

// Generate at build time and refresh hourly. Prevents cold serverless
// invocations that could 500 (which delays Google's sitemap processing).
export const dynamic = 'force-static';
export const revalidate = 3600;

const STATIC_ENTRIES: MetadataRoute.Sitemap = [
  {
    url: `${SITE.url}/`,
    changeFrequency: 'weekly',
    priority: 1,
  },
  {
    url: `${SITE.url}/articles`,
    changeFrequency: 'weekly',
    priority: 0.9,
  },
  {
    url: `${SITE.url}/resume`,
    changeFrequency: 'monthly',
    priority: 0.8,
  },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();
  const staticEntries: MetadataRoute.Sitemap = STATIC_ENTRIES.map((e) => ({
    ...e,
    lastModified: now,
  }));

  // Never let an article parse failure take down the whole sitemap —
  // Google treats a 500 on sitemap.xml as a crawl failure.
  let articleEntries: MetadataRoute.Sitemap = [];
  try {
    const articles = await getAllArticles();
    articleEntries = articles.map((a) => ({
      url: `${SITE.url}/articles/${a.slug}`,
      lastModified: a.updated ?? a.date,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));
  } catch (err) {
    console.error('[sitemap] failed to enumerate articles', err);
  }

  return [...staticEntries, ...articleEntries];
}
