import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { PlaygroundClient } from '@/components/playground/PlaygroundClient';
import './playground.css';

export const metadata: Metadata = buildMetadata({
  title: 'AI Playground — MalakaVenu',
  description:
    'A small AI playground: generate images from a prompt, restyle photos, chat with the site, and edit images using built-in browser tools.',
  path: '/playground',
  noIndex: true,
});

export const dynamic = 'force-dynamic';

export default function PlaygroundPage() {
  return (
    <section className="pg-hero section">
      <div className="container" style={{ maxWidth: 1080 }}>
        <header style={{ marginBottom: 28 }}>
          <span className="pg-hero-eyebrow">
            <span className="pg-pulse" aria-hidden="true" />
            Live · free to try
          </span>
          <h1 className="pg-hero-title">
            Bring an idea to life — <span className="pg-grad">image</span>,{' '}
            <span className="pg-grad">conversation</span>, or{' '}
            <span className="pg-grad">remix</span>.
          </h1>
          <p className="pg-hero-sub">
            A tiny corner of the site where I get to play. Type a prompt and watch a model paint
            it, restyle a photo of yours, or have a chat with this website. Built with the same
            agentic patterns I write about — running entirely in your browser and on the edge.
          </p>
          <div className="pg-hero-stats" aria-label="Playground capabilities">
            <span className="pg-hero-stat">
              <span className="pg-dot" aria-hidden="true" />
              <strong>4</strong>&nbsp;image models
            </span>
            <span className="pg-hero-stat">
              <span className="pg-dot" aria-hidden="true" />
              <strong>8+</strong>&nbsp;one-tap styles
            </span>
            <span className="pg-hero-stat">
              <span className="pg-dot" aria-hidden="true" />
              Streams in <strong>&lt; 1s</strong>
            </span>
            <span className="pg-hero-stat">
              <span className="pg-dot" aria-hidden="true" />
              No sign-up · no storage
            </span>
          </div>
        </header>

        <PlaygroundClient />
      </div>
    </section>
  );
}
