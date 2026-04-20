import { ImageResponse } from 'next/og';
import { getArticleBySlug, getAllSlugs } from '@/lib/articles';
import { SITE } from '@/lib/site';

export const runtime = 'nodejs';
export const alt = 'Article cover';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function ArticleOG({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const resolved = await Promise.resolve(params);
  const article = await getArticleBySlug(resolved.slug);
  const title = article?.title ?? SITE.name;
  const category = article?.category ?? 'Writing';
  const dateLabel = article
    ? new Date(article.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background:
            'linear-gradient(135deg, #0c0e16 0%, #14182a 60%, #0c0e16 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(800px 500px at 0% 0%, rgba(124,92,255,0.32), transparent 60%), radial-gradient(700px 500px at 100% 100%, rgba(34,211,238,0.22), transparent 60%)',
            display: 'flex',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              padding: '8px 18px',
              border: '1.5px solid rgba(124,92,255,0.55)',
              background: 'rgba(124,92,255,0.18)',
              color: '#d6c8ff',
              borderRadius: 999,
              fontSize: 22,
              letterSpacing: 4,
              textTransform: 'uppercase',
              display: 'flex',
            }}
          >
            {category}
          </div>
          {dateLabel && (
            <div style={{ color: '#8a93a6', fontSize: 22, display: 'flex' }}>
              · {dateLabel}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: -1.5,
            maxWidth: 1040,
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#cdd1de',
            fontSize: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #7c5cff 0%, #22d3ee 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
              }}
            >
              M
            </div>
            <div style={{ display: 'flex' }}>{SITE.name}</div>
          </div>
          <div style={{ display: 'flex' }}>malakavenu.com/articles</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
