import { type ArticleFreshness, getArticleVisual } from '@/lib/articleVisuals';

type Props = {
  slug: string;
  index?: number;
  size?: 'default' | 'large' | 'compact' | 'banner';
  badge?: string;
  freshness?: ArticleFreshness | null;
};

const FRESHNESS_LABEL: Record<ArticleFreshness, string> = {
  new: 'New',
  updated: 'Updated',
};

export function ArticleCover({
  slug,
  index = 0,
  size = 'default',
  badge,
  freshness = null,
}: Props) {
  const v = getArticleVisual(slug, index);
  const sizeClass = size === 'default' ? '' : ` cover-${size}`;
  const hasLogos = v.logos && v.logos.length > 0;

  return (
    <div
      className={`article-cover article-cover--${v.variant}${sizeClass}`}
      aria-hidden="true"
    >
      {v.ornament && (
        <div className={`cover-ornament cover-ornament--${v.ornament}`} aria-hidden="true" />
      )}

      {hasLogos ? (
        <div className={`cover-logos cover-logos--${v.logos!.length}`}>
          {v.logos!.map((logo) => (
            <span
              key={logo.slug}
              className="cover-logo"
              style={{ ['--logo-color' as string]: `#${logo.hex}` } as React.CSSProperties}
              title={logo.title}
            >
              <span className="cover-logo-halo" aria-hidden="true" />
              <svg viewBox="0 0 24 24" role="img" aria-label={logo.title}>
                <path d={logo.path} />
              </svg>
            </span>
          ))}
        </div>
      ) : v.mono ? (
        <span className="article-mono cover-mono-large">{v.mono}</span>
      ) : null}

      {freshness && (
        <span className={`cover-freshness cover-freshness--${freshness}`}>
          <span className="cover-freshness-dot" aria-hidden="true" />
          {FRESHNESS_LABEL[freshness]}
        </span>
      )}
      {badge && <span className="featured-badge">{badge}</span>}
    </div>
  );
}
