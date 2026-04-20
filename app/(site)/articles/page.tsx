import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ArticleCover } from '@/components/articles/ArticleCover';
import { ArticlesIndex } from '@/components/articles/ArticlesIndex';
import { JsonLd } from '@/components/site/JsonLd';
import { getAllArticles } from '@/lib/articles';
import { countsByTopic, totalReadingMinutes } from '@/lib/articleTopics';
import { getArticleFreshness } from '@/lib/articleVisuals';
import { blogLd, breadcrumbLd, buildMetadata } from '@/lib/seo';
import { SITE } from '@/lib/site';

export const metadata: Metadata = buildMetadata({
  title: 'Writing — Notes from the AI & frontend trenches',
  description:
    'Patterns, post-mortems and field notes on agent skills, subagents, MCP, and the frontend platform underneath them.',
  path: '/articles',
});

export const revalidate = 3600;

function formatLongDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function ArticlesPage() {
  const articles = await getAllArticles();
  const counts = countsByTopic(articles);
  const totalMinutes = totalReadingMinutes(articles);
  const featured = articles[0];
  const sidekicks = articles.slice(1, 3);
  const lastUpdated = articles[0]?.updated ?? articles[0]?.date;

  return (
    <>
      <JsonLd
        data={blogLd(
          articles.map((a) => ({ slug: a.slug, title: a.title, publishedAt: a.date })),
        )}
      />
      <JsonLd
        data={breadcrumbLd([
          { name: 'Home', url: `${SITE.url}/` },
          { name: 'Writing', url: `${SITE.url}/articles` },
        ])}
      />

      <section className="article-page writing-page container">
        <Link href="/#writing" className="article-back">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Home
        </Link>

        <header className="writing-header">
          <span className="section-eyebrow">Writing</span>
          <h1>
            Notes from the <span className="grad">AI &amp; frontend</span> trenches
          </h1>
          <p className="writing-lede">
            Patterns, post-mortems, and field notes on agent skills, subagents, MCP, and
            the frontend platform underneath them. New posts roughly every two weeks.
          </p>

          <ul className="writing-stats" aria-label="Library stats">
            <li>
              <strong>{articles.length}</strong> essays
            </li>
            <li>
              <strong>~{totalMinutes}</strong> min of reading
            </li>
            {lastUpdated && (
              <li>
                Last updated <strong>{formatLongDate(lastUpdated)}</strong>
              </li>
            )}
            <li>
              <Link href="/rss.xml" className="writing-stat-link">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 11a9 9 0 0 1 9 9" />
                  <path d="M4 4a16 16 0 0 1 16 16" />
                  <circle cx="5" cy="19" r="1" />
                </svg>
                RSS
              </Link>
            </li>
          </ul>
        </header>

        {featured && (
          <section className="writing-featured" aria-label="Featured writing">
            <Link
              href={`/articles/${featured.slug}`}
              className="article-card featured-card"
            >
              <ArticleCover
                slug={featured.slug}
                size="large"
                badge="Latest"
                freshness={getArticleFreshness(featured)}
              />
              <div className="article-body featured-body">
                <div className="article-meta">
                  <span className="article-tag">{featured.category ?? 'Writing'}</span>
                  <span className="article-dot">·</span>
                  <time dateTime={featured.date}>{formatLongDate(featured.date)}</time>
                  <span className="article-dot">·</span>
                  <span>{featured.readingTimeText}</span>
                </div>
                <h2 className="featured-title">{featured.title}</h2>
                <p className="article-desc featured-desc">{featured.description}</p>
                <span className="featured-cta">
                  Read essay
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              </div>
            </Link>

            <div className="featured-sidekicks">
              {sidekicks.map((a, i) => (
                <Link
                  key={a.slug}
                  href={`/articles/${a.slug}`}
                  className="article-card sidekick-card"
                >
                  <ArticleCover
                    slug={a.slug}
                    index={i + 1}
                    size="compact"
                    freshness={getArticleFreshness(a)}
                  />
                  <div className="article-body">
                    <div className="article-meta">
                      <span className="article-tag">{a.category ?? 'Writing'}</span>
                      <span className="article-dot">·</span>
                      <span>{a.readingTimeText}</span>
                    </div>
                    <h3 className="article-title">{a.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <Suspense fallback={null}>
          <ArticlesIndex articles={articles} counts={counts} />
        </Suspense>

        <section className="writing-foot">
          <p>
            More articles coming soon. Subscribe via{' '}
            <Link href="/rss.xml">RSS</Link> or follow on{' '}
            <a href={SITE.socials.x} target="_blank" rel="noopener">
              X
            </a>
            ,{' '}
            <a href={SITE.socials.linkedin} target="_blank" rel="noopener">
              LinkedIn
            </a>{' '}
            or{' '}
            <a href={SITE.socials.facebook} target="_blank" rel="noopener">
              Facebook
            </a>
            .
          </p>
        </section>
      </section>
    </>
  );
}
