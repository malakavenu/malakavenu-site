import type { Metadata } from 'next';
import { MemeStudio, createMemeStudioConfig } from '@/modules/meme-studio';

export const metadata: Metadata = {
  title: 'Meme Studio — Bilingual Political Memes',
  description:
    'Turn YouTube speeches into shareable English + Telugu political memes, grounded in the transcript and composed with leader faces, stickers and AI backgrounds.',
  robots: { index: false, follow: false },
};

// NOTE: this config is passed to a client component, so it MUST NOT contain
// any secrets. API keys are read server-side only (see modules/meme-studio/
// adapters/env.ts → process.env) inside the API route handlers. Never add an
// `adapters.env` block here — it would serialize keys into the browser bundle.
const config = createMemeStudioConfig({
  basePath: '/meme-studio',
  apiBasePath: '/api/meme-studio',
  defaultLanguage: 'te',
  languages: ['en', 'te'],
  defaultTarget: 'kutami',
  textProvider: 'auto',
  // Cursor for everything: captions as text, "images" as SVG vector art.
  // (Cursor can't do photoreal raster; it falls back to OpenAI/Pollinations.)
  imageProvider: 'cursor',
  theme: 'dark',
});

export default function MemeStudioPage() {
  return <MemeStudio config={config} />;
}
