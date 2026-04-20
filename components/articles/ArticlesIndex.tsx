'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArticleCover } from '@/components/articles/ArticleCover';
import type { ArticleMeta } from '@/lib/articles';
import { TOPIC_GROUPS, topicById } from '@/lib/articleTopics';
import { getArticleFreshness } from '@/lib/articleVisuals';
import { track } from '@/lib/track';

type Props = {
  articles: ArticleMeta[];
  counts: Record<string, number>;
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function ArticlesIndex({ articles, counts }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTopic = searchParams?.get('topic') ?? 'all';
  const [activeTopic, setActiveTopic] = useState<string>(
    TOPIC_GROUPS.some((g) => g.id === initialTopic) ? initialTopic : 'all',
  );

  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (activeTopic === 'all') {
      params.delete('topic');
    } else {
      params.set('topic', activeTopic);
    }
    const query = params.toString();
    const url = query ? `/articles?${query}` : '/articles';
    router.replace(url, { scroll: false });
  }, [activeTopic, router, searchParams]);

  const group = useMemo(() => topicById(activeTopic), [activeTopic]);
  const filtered = useMemo(
    () => articles.filter((a) => group.match(a.category)),
    [articles, group],
  );

  return (
    <>
      <div
        className="writing-controls reveal in"
        role="tablist"
        aria-label="Filter writing by topic"
      >
        <div className="writing-filters">
          {TOPIC_GROUPS.map((g) => {
            const count = counts[g.id] ?? 0;
            const disabled = g.id !== 'all' && count === 0;
            const active = g.id === activeTopic;
            return (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={disabled}
                onClick={() => {
                  setActiveTopic(g.id);
                  track('topic_filter', { topic: g.id, location: 'articles_page' });
                }}
                className={`writing-filter${active ? ' active' : ''}${disabled ? ' is-disabled' : ''}`}
              >
                <span>{g.label}</span>
                <span className="writing-filter-count">{count}</span>
              </button>
            );
          })}
        </div>
        <p className="writing-filter-summary">
          Showing <strong>{filtered.length}</strong> of {articles.length}
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="reading-empty">Nothing in this topic yet — try another pill above.</p>
      ) : (
        <div className="article-grid writing-grid" key={activeTopic}>
          {filtered.map((a, i) => {
            const isWide = filtered.length >= 5 && (i + 1) % 5 === 0;
            return (
            <Link
              key={a.slug}
              href={`/articles/${a.slug}`}
              className={`article-card writing-grid-card${isWide ? ' is-wide' : ''}`}
              style={{ ['--stagger' as string]: `${Math.min(i, 11) * 55}ms` } as React.CSSProperties}
            >
              <ArticleCover
                slug={a.slug}
                index={i}
                freshness={getArticleFreshness(a)}
              />
              <div className="article-body">
                <div className="article-meta">
                  <span className="article-tag">{a.category ?? 'Writing'}</span>
                  <span className="article-dot">·</span>
                  <time dateTime={a.date}>{formatDate(a.date)}</time>
                  <span className="article-dot">·</span>
                  <span>{a.readingTimeText}</span>
                </div>
                <h3 className="article-title">{a.title}</h3>
                <p className="article-desc">{a.description}</p>
              </div>
            </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
