import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { PlaygroundClient } from '@/components/playground/PlaygroundClient';

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
    <section className="section">
      <div className="container">
        <div className="section-head" style={{ textAlign: 'left', maxWidth: 820, marginBottom: 40 }}>
          <span className="section-eyebrow">Experiment</span>
          <h1 className="section-title">
            AI <span className="grad">Playground</span>
          </h1>
          <p className="section-subtitle">
            Generate images from a prompt, restyle a photo with AI or instant filters, or chat
            with the site. Free to try.
          </p>
        </div>

        <PlaygroundClient />
      </div>
    </section>
  );
}
