import Link from 'next/link';
import { ArticleCover } from '@/components/articles/ArticleCover';
import { WritingTopicPills } from './WritingTopicPills';
import { getAllArticles } from '@/lib/articles';
import { TOPIC_GROUPS, countsByTopic } from '@/lib/articleTopics';
import { getArticleFreshness } from '@/lib/articleVisuals';

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export async function WritingTeaser() {
  const articles = await getAllArticles();
  const featured = articles[0];
  const recent = articles.slice(1, 5);
  const counts = countsByTopic(articles);
  const topicPills = TOPIC_GROUPS.filter((g) => g.id !== 'all' && counts[g.id] > 0);

  if (!featured) {
    return null;
  }

  return (
    <section id="writing" className="section">
      <div className="container">
        <div className="section-head reveal in">
          <span className="section-eyebrow">Writing</span>
          <h2 className="section-title">
            Notes from the <span className="grad">AI &amp; frontend</span> trenches
          </h2>
          <p className="section-subtitle">
            {articles.length} field essays on agent skills, subagents, MCP, and the
            frontend platform underneath. Built to be skim-friendly and code-heavy.
          </p>
        </div>

        <div className="writing-hero reveal in">
          <Link
            href={`/articles/${featured.slug}`}
            className="article-card writing-hero-feature"
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
                <time dateTime={featured.date}>{formatDate(featured.date)}</time>
                <span className="article-dot">·</span>
                <span>{featured.readingTimeText}</span>
              </div>
              <h3 className="featured-title">{featured.title}</h3>
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

          <aside className="writing-recent" aria-label="Recent essays">
            <header className="writing-recent-head">
              <span>Recent</span>
              <Link href="/articles" className="writing-recent-all">
                See all →
              </Link>
            </header>
            <ul className="writing-recent-list">
              {recent.map((a) => (
                <li key={a.slug}>
                  <Link href={`/articles/${a.slug}`} className="writing-mini-card">
                    <span className="writing-mini-tag">{a.category ?? 'Writing'}</span>
                    <span className="writing-mini-title">{a.title}</span>
                    <span className="writing-mini-meta">
                      <time dateTime={a.date}>{formatDate(a.date)}</time>
                      <span aria-hidden="true">·</span>
                      <span>{a.readingTimeText}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        <div className="writing-topics reveal in">
          <span className="writing-topics-label">Browse by topic</span>
          <WritingTopicPills
            topics={topicPills.map((g) => ({ id: g.id, label: g.label }))}
            counts={counts}
          />
        </div>

        <div className="article-cta reveal in">
          <Link href="/articles" className="btn btn-ghost">
            Browse all {articles.length} articles
            <svg
              className="btn-icon"
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
          <Link href="/rss.xml" className="article-rss" aria-label="Subscribe via RSS">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 11a9 9 0 0 1 9 9" />
              <path d="M4 4a16 16 0 0 1 16 16" />
              <circle cx="5" cy="19" r="1" />
            </svg>
            RSS
          </Link>
        </div>
      </div>
    </section>
  );
}
