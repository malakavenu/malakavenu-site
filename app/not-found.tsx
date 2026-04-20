import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '404 — Page not found',
  description:
    "That page doesn't exist on malakavenu.com. Head back to the homepage to explore the portfolio.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main
      className="err"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div className="err-inner" style={{ maxWidth: 640 }}>
        <div
          className="err-code"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(5rem, 18vw, 10rem)',
            fontWeight: 700,
            lineHeight: 1,
            background: 'var(--grad-primary)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            letterSpacing: '-0.04em',
          }}
        >
          404
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
            margin: '0.5rem 0 1rem',
            color: 'var(--text)',
          }}
        >
          This page wandered off the architecture diagram.
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          The link is broken or the page has moved. Let&apos;s get you back on track.
        </p>
        <div
          className="err-actions"
          style={{
            display: 'inline-flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <Link className="btn btn-primary" href="/">
            Back to home
          </Link>
          <Link className="btn btn-ghost" href="/#portfolio">
            See work
          </Link>
          <Link className="btn btn-ghost" href="/articles">
            Writing
          </Link>
          <Link className="btn btn-ghost" href="/#contact">
            Contact
          </Link>
        </div>
      </div>
    </main>
  );
}
