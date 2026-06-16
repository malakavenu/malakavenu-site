# @malakavenu/meme-studio

Bilingual (English + Telugu) political meme generator for YSRCP. Turns a
YouTube speech/press-meet transcript into shareable meme concepts, then composes
finished memes on a canvas with leader faces, stickers, party symbols and AI or
uploaded backgrounds.

Mounted at `/meme-studio` (see `app/meme-studio/`). Mirrors the `voice-studio`
module pattern: self-contained, config-driven, with thin app route shims.

## Pipeline

```
YouTube URL / pasted text
        │  POST /api/meme-studio/transcript   (server/youtube.ts)
        ▼
   transcript text
        │  POST /api/meme-studio/ideas        (text provider → MemeConcept[])
        ▼
   meme concepts (grounded in transcript, EN + TE captions)
        │  Studio panel: AI/upload/color background + faces + stickers + captions
        │  POST /api/meme-studio/image        (image provider, optional)
        ▼
   client canvas compositor → PNG export + local history
```

## Providers

Captions/ideas (text) — auto-selected by available keys, in order:

1. **Cursor SDK** (`CURSOR_API_KEY`) — default `claude-opus-4-7` (`CURSOR_MODEL`).
   Runs `Agent.create` against an isolated scratch dir with a validate-and-retry
   loop. Text only.
2. **Anthropic** (`ANTHROPIC_API_KEY`)
3. **OpenAI** (`OPENAI_API_KEY`)
4. **Pollinations** (`POLLINATIONS_API_KEY`) — fallback, **gated behind the key**
   so `/ideas` can't be abused as a free, keyless LLM proxy.

Images — auto-selected:

1. **Cursor SDK** (`CURSOR_API_KEY`) — emits SVG vector art (the default
   `imageProvider`).
2. **OpenAI `gpt-image-2`** (`OPENAI_API_KEY`) — photoreal raster fallback.
3. **Pollinations** (`flux`) — final fallback.

> Cursor SDK / Claude models cannot generate raster images (SVG only).

If **no** text provider key is configured the `/ideas` route returns `503`.
Outbound provider calls have a 60s timeout and upstream error bodies are
truncated before logging. Override selection per-deploy via
`createMemeStudioConfig({ textProvider, imageProvider })`.

## Environment variables

```
CURSOR_API_KEY=        # Cursor SDK (captions + SVG art) — primary
CURSOR_MODEL=          # optional, default claude-opus-4-7
ANTHROPIC_API_KEY=     # optional caption fallback
OPENAI_API_KEY=        # caption fallback + gpt-image-2 raster images
POLLINATIONS_API_KEY=  # optional fallback (required to enable Pollinations text)

# Rate limiting (optional but recommended in production). Without these the
# limiter is a graceful no-op. Upstash Redis REST or Vercel KV — same vars.
KV_REST_URL=           # or UPSTASH_REDIS_REST_URL
KV_REST_TOKEN=         # or UPSTASH_REDIS_REST_TOKEN

# YouTube transcript proxy (see "YouTube captions" below). Required for the
# YouTube URL flow to work from cloud hosts (Vercel/AWS); ignored if unset.
YOUTUBE_PROXY=         # or YOUTUBE_PROXY_URL, e.g. http://user:pass@host:port
```

## YouTube captions

The YouTube URL flow uses `youtube-transcript`, which talks to YouTube's
internal Innertube API with a watch-page fallback. This works from **residential
IPs** (your laptop), so captions fetch fine in local dev.

From **datacenter IPs** (Vercel, AWS, most clouds) YouTube blocks both paths —
recaptcha wall + empty caption payloads — so the **same video** returns
"no captions could be fetched" in production even though it works locally. This
is a YouTube anti-bot measure, not a bug in this module.

To make the URL flow work in production, set `YOUTUBE_PROXY` to a
**residential or rotating HTTP(S) proxy**; every YouTube request is then routed
through it (via undici `ProxyAgent`). Without a proxy, users can still **paste
the transcript text manually** — that path needs no network access to YouTube.

> Secrets are read **server-side only** (`adapters/env.ts` → `process.env`).
> Never pass an `adapters.env` block into the client `createMemeStudioConfig`
> in `app/meme-studio/page.tsx` — it would ship keys to the browser.

## Abuse protection (production)

All four API routes are public (consistent with the rest of the app) but
hardened:

- **Rate limits** (per anonymised client fingerprint, sliding window, via
  `lib/kv.ts`): transcript 30 / image 30 / ideas 20 / asset 15 — each per
  5 minutes. Over-limit requests get `429` + `Retry-After`. No-op without KV.
- **Body caps**: transcript ≤ 50k chars (sliced to 12k for the LLM), prompts
  clamped, `knownLeaders`/`tags` bounded.
- **Asset writes** require a writable disk; on serverless/read-only hosts
  (`VERCEL`, `AWS_LAMBDA_FUNCTION_NAME`) `/asset` returns `501` instead of
  crashing. Use it for local authoring.

## Asset library (you supply the images)

The tool never auto-downloads. For each concept the LLM lists the faces /
symbols / stickers it wants in **Assets needed**, with a suggested Google search
and a target folder. Download and drop files into:

- `public/meme-studio/faces/<leaderId>/<expression>.png`
- `public/meme-studio/assets/<category>/<name>.png`  (`symbols`, `bubbles`,
  `stickers`, `stamps`, `banners`)

Then regenerate manifests:

```
npm run meme-studio:reindex
```

See `public/meme-studio/README.md` for manifest shapes.

## Curated knowledge

`data/knowledge.ts` holds the editable party context (YSRCP/Jagan, schemes,
slogans, the TDP/Janasena/BJP Kutami, recurring themes, Telugu meme style). It is
folded into the LLM system prompt by `data/prompts.ts`. Keep it factual — humour
should come from framing and the transcript, not fabricated claims.

## Layout

```
modules/meme-studio/
  config.ts, types.ts, index.ts, adapters/env.ts
  data/        knowledge, prompts, templates (formats), faces, assets
  server/      youtube.ts, handlers.ts, rate-limit.ts, providers/*
  client/      brand-compositor.ts, auto-compose.ts, fonts.ts, history.ts
  ui/          MemeStudio.tsx, MemeStudioContext, panels/, shared/ (incl. ErrorBoundary)
  styles/      meme-studio.module.css
  scripts/     reindex.mjs
```
