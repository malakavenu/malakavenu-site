import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

// AI crawlers split by *intent*, not vendor.
//
// In 2026 the most valuable SEO signal is no longer just Google rankings — it's
// being *cited* by AI answer engines (Perplexity, ChatGPT search, Copilot,
// Apple Intelligence, Google AI Overviews). Those bots send real referral
// traffic and act as 0-click discovery surfaces.
//
// We therefore allow bots whose job is "find an answer for a user right now"
// and only block bots whose job is "scrape this page into a future training
// corpus." The split mirrors each vendor's published bot purpose docs.

// ---- ALLOW: live answer / search / citation crawlers --------------------
// (intentionally NOT in the disallow list)
//   PerplexityBot          — Perplexity citations
//   OAI-SearchBot          — ChatGPT / SearchGPT live answers
//   ChatGPT-User           — ChatGPT browsing on behalf of a user
//   Applebot-Extended      — Apple Intelligence + Siri citations
//   Google-Extended        — Gemini & AI Overviews source citations
//   Bingbot / Slurp / DuckDuckBot — fall under userAgent: '*'

// ---- BLOCK: training-only / mass-scraper crawlers -----------------------
const AI_TRAINING_BOT_BLOCKLIST = [
  'GPTBot', // OpenAI training corpus
  'ClaudeBot', // Anthropic training (formerly Claude-Web)
  'Claude-Web',
  'anthropic-ai',
  'CCBot', // Common Crawl
  'Bytespider', // ByteDance / TikTok training
  'cohere-ai',
  'YouBot',
  'FacebookBot',
  'Meta-ExternalAgent',
  'Meta-ExternalFetcher',
  'Diffbot',
  'Omgili',
  'ImagesiftBot',
  'Timpibot',
  'Webzio-Extended',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/', '/private/'],
      },
      ...AI_TRAINING_BOT_BLOCKLIST.map((bot) => ({ userAgent: bot, disallow: '/' })),
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
