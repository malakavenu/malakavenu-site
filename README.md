# malakavenu.com — Portfolio & Writing

Personal portfolio, resume and writing of Malaka Venugopal Reddy. Built on Next.js 16 (App Router), React 19, TypeScript, MDX and `next/og` — deployed on Vercel.

## Stack

- **Framework**: Next.js 16 (App Router, RSC, Turbopack)
- **Language**: TypeScript (strict)
- **Content**: MDX in `/content/articles/*.mdx` (gray-matter frontmatter, reading-time, rehype-pretty-code)
- **Styling**: Hand-crafted CSS with CSS variables, Inter + Space Grotesk via `next/font/google`
- **SEO**: Metadata API, JSON-LD (Person, WebSite, ProfessionalService, Blog, BlogPosting, BreadcrumbList, ProfilePage), dynamic sitemap, robots, manifest, RSS, dynamic OG images via `ImageResponse`
- **Forms**: Server Actions + Resend (graceful `mailto:` fallback)
- **Comments**: Giscus (GitHub Discussions) — auto-hidden until configured
- **Analytics**: `@vercel/analytics` + `@vercel/speed-insights`
- **Hosting**: Vercel

## Local development

```bash
npm install
cp .env.example .env.local   # fill in optional keys
npm run dev                  # http://localhost:3000
```

Other scripts:

```bash
npm run build       # production build
npm run start       # serve the production build
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm run format      # prettier --write .
```

## Adding a new article

1. Create `content/articles/<slug>.mdx`.
2. Add frontmatter:

   ```mdx
   ---
   title: 'Your title'
   description: 'One-sentence summary used for SEO and listing pages.'
   date: '2026-04-20'
   updated: '2026-04-20'
   category: 'AI Patterns'
   tags: ['Agent Skills', 'MCP']
   author: 'Malaka Venugopal Reddy'
   ---

   Your MDX content here. GFM, footnotes, code blocks with syntax highlighting all work.
   ```

3. Save. The article will appear at `/articles/<slug>`, in `/articles`, the homepage teaser, the sitemap, and the RSS feed automatically.

The article OG image is generated dynamically from frontmatter via `app/(site)/articles/[slug]/opengraph-image.tsx`.

## Deployment

This is a zero-config Vercel deploy:

1. Push the repo to GitHub.
2. Import it on https://vercel.com/new.
3. Add environment variables (see `.env.example`). At minimum, set `NEXT_PUBLIC_SITE_URL=https://malakavenu.com`.
4. Add `malakavenu.com` and `www.malakavenu.com` as production domains.

### DNS

Point your apex (`malakavenu.com`) `A` record to Vercel's IPs and `www` `CNAME` to `cname.vercel-dns.com.` Full guide: https://vercel.com/docs/projects/domains/add-a-domain.

### Legacy redirects

`next.config.ts` redirects all the old GitHub Pages `.html` URLs (`/index.html`, `/articles.html`, `/resume.html`, `/articles/<slug>.html`) to the new pretty URLs with HTTP 308.

## Project structure

```
app/
  (site)/                 # public site route group (header / footer chrome)
    page.tsx              # homepage (Hero, About, Skills, CaseStudies, Writing, Contact …)
    resume/page.tsx       # print-optimized A4 resume
    articles/page.tsx     # writing index
    articles/[slug]/      # MDX article render (+ generated OG image)
  actions/                # Server Actions (contact form)
  rss.xml/route.ts        # RSS feed route handler
  sitemap.ts              # dynamic sitemap
  robots.ts               # robots + AI-bot opt-out
  manifest.ts             # PWA manifest
  opengraph-image.tsx     # site-wide social card
  layout.tsx              # root layout (fonts, metadata, JSON-LD, analytics)
components/
  site/                   # site chrome (Header, Footer, MobileDock, ScrollProgress …)
  home/                   # homepage section components
  article/                # article shell (ShareButtons, Giscus, Mdx renderer)
  mdx/                    # MDX component overrides
content/
  articles/*.mdx          # the writing
lib/
  site.ts                 # SITE constants
  seo.ts                  # buildMetadata + JSON-LD builders
  articles.ts             # MDX loader (frontmatter + reading-time)
public/                   # images, favicon, resume PDF, security.txt …
```

## Tracking & attribution

Privacy-first, provider-swappable analytics. All tracking is off when the browser sends `DNT=1` or when the `mv_track_opt_out=1` cookie is set.

**Layers**

- `lib/track.ts` / `lib/trackServer.ts` — thin wrappers over `@vercel/analytics`. Swap in Plausible / Umami / PostHog by editing one file.
- `lib/attribution.ts` — captures first-touch `referrer_host`, UTM params, short-link `src` and landing path into the first-party `mv_attr` cookie (30 days, base64 JSON, no PII).
- `components/site/AttributionBoot.tsx` — mounted once in the `(site)` layout. Fires `page_view` on every route change.
- `components/article/ReadTracker.tsx` — scroll-depth milestones (25/50/75/100) + `article_completed` when depth ≥ 90 % **and** time-on-page ≥ 40 % of estimated reading time.
- `components/article/ReadingNow.tsx` + `app/api/live/[slug]/route.ts` — live "N reading now" badge backed by a 5-minute sliding window on a KV sorted set. Silently hidden when `KV_REST_URL` is empty.
- `components/home/GeoBadge.tsx` + `app/api/geo/route.ts` — friendly "Hi from &lt;city&gt;" chip from edge geo headers. Not persisted anywhere.
- `app/r/[source]/route.ts` — short-link redirector. Use on LinkedIn bio (`/r/linkedin`), email sigs (`/r/email?to=/articles`), QR codes, etc. Sets `?src=` on the landing URL which `AttributionBoot` captures.

**Portability**

Move off Vercel and the only things that change are the `lib/track.ts` provider (any analytics vendor works) and the geo headers in `lib/visitorGeo.ts` (already supports Cloudflare). The cookie, short-link, read-tracker and KV (Upstash-compatible) layers are all vendor-neutral.

## Security

`next.config.ts` ships HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy`. A `security.txt` lives at `/.well-known/security.txt`.

## License

Code: MIT. Article content & assets: © Malaka Venugopal Reddy.
