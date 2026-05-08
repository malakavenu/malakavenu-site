import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { JsonLd } from '@/components/site/JsonLd';
import { ArticleCover } from '@/components/articles/ArticleCover';
import { Mdx } from '@/components/article/Mdx';
import { ShareButtons } from '@/components/article/ShareButtons';
import { ReadTracker } from '@/components/article/ReadTracker';
import { ReadingNow } from '@/components/article/ReadingNow';
import { Giscus } from '@/components/article/Giscus';
import { ArticleReadingRail } from '@/components/assistant/ArticleReadingRail';
import { getAllArticles, getArticleBySlug, getAllSlugs } from '@/lib/articles';
import { getArticleFreshness } from '@/lib/articleVisuals';
import { blogPostingLd, breadcrumbLd, buildMetadata } from '@/lib/seo';
import { SITE } from '@/lib/site';

type Params = { slug: string };

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export const dynamicParams = false;

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};
  return buildMetadata({
    title: article.title,
    description: article.description,
    path: `/articles/${article.slug}`,
    image: article.ogImage ?? `${SITE.url}/articles/${article.slug}/og`,
    type: 'article',
    publishedTime: article.date,
    modifiedTime: article.updated ?? article.date,
    tags: article.tags,
  });
}

export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const all = await getAllArticles();
  const idx = all.findIndex((a) => a.slug === slug);
  const next = idx >= 0 ? all[idx + 1] ?? null : null;
  const related = all
    .filter(
      (a) =>
        a.slug !== slug &&
        article.category &&
        a.category === article.category,
    )
    .slice(0, 3);

  const url = `${SITE.url}/articles/${article.slug}`;
  const dateLabel = new Date(article.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <>
      <JsonLd
        data={blogPostingLd({
          slug: article.slug,
          title: article.title,
          description: article.description,
          publishedAt: article.date,
          updatedAt: article.updated,
          tags: article.tags,
          wordCount: article.wordCount,
        })}
      />
      <JsonLd
        data={breadcrumbLd([
          { name: 'Home', url: `${SITE.url}/` },
          { name: 'Writing', url: `${SITE.url}/articles` },
          { name: article.title, url },
        ])}
      />

      <article className="article-page container">
        <Link href="/articles" className="article-back">
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
          Back to Writing
        </Link>

        <ArticleCover
          slug={article.slug}
          size="banner"
          freshness={getArticleFreshness(article)}
        />

        <header>
          <div className="article-meta">
            <span className="article-tag">{article.category ?? 'Writing'}</span>
            <span className="article-dot">·</span>
            <time dateTime={article.date}>{dateLabel}</time>
            <span className="article-dot">·</span>
            <span>{article.readingTimeText}</span>
            <ReadingNow slug={article.slug} />
          </div>
          <h1>{article.title}</h1>
          <p className="article-desc" style={{ fontSize: '1.1rem' }}>
            {article.description}
          </p>
          <ShareButtons url={url} title={article.title} slug={article.slug} />
        </header>

        <div className="article-content">
          <Mdx source={article.content} />
        </div>

        <ArticleReadingRail
          slug={article.slug}
          title={article.title}
          speakable={toSpeakable(article.content)}
        />

        <ReadTracker
          slug={article.slug}
          readingMinutes={article.readingTimeMinutes}
        />

        {next && (
          <Link href={`/articles/${next.slug}`} className="article-next">
            <div>
              <div className="lbl">Read next</div>
              <div className="ttl">{next.title}</div>
            </div>
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
          </Link>
        )}

        {related.length > 0 && (
          <section className="article-related" aria-label="Related essays">
            <header className="article-related-head">
              <span className="article-related-eyebrow">Continue in</span>
              <span className="article-related-topic">{article.category}</span>
            </header>
            <div className="article-related-grid">
              {related.map((a, i) => (
                <Link
                  key={a.slug}
                  href={`/articles/${a.slug}`}
                  className="article-card related-card"
                >
                  <ArticleCover
                    slug={a.slug}
                    index={i}
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

        <section className="article-comments" id="comments">
          <h2>Comments</h2>
          <Giscus />
        </section>
      </article>
    </>
  );
}

/**
 * Convert MDX/Markdown body into a clean plain-text string suitable for TTS.
 * Strips JSX, code fences, images, and Markdown syntax. Conservative: any
 * residue is fine — TTS will gracefully ignore stray characters.
 */
function toSpeakable(mdx: string): string {
  return mdx
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/^\s{0,3}#+\s+/gm, '')
    .replace(/[*_~>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
