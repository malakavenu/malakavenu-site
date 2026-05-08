# SEO & Indexing — Operator's Checklist

Everything in **§1 What's already wired** is on the codebase today; you don't need to re-do it. The actionable steps are in **§2 First-time setup** and **§3 After every deploy / new article**.

## 1. What's already wired (no action needed)

| Asset | Path | Notes |
|--|--|--|
| Sitemap | `/sitemap.xml` | `app/sitemap.ts` — auto-includes every published article, hourly revalidate |
| Robots | `/robots.txt` | `app/robots.ts` — allows search engines, blocks `/api`, blocks AI scrapers (GPTBot, ClaudeBot, …) |
| RSS feed | `/rss.xml` | Linked from `<head>` — gets you into Feedly/Inoreader |
| Web manifest | `/manifest.webmanifest` | PWA install + Android home-screen |
| OG image | `/images/og-image.png` | 1200×630, used by every page unless overridden |
| Per-page metadata | `lib/seo.ts` → `buildMetadata()` | Title, description, canonical, OG, Twitter card |
| Structured data (JSON-LD) | `lib/seo.ts` | Person, Website, BlogPosting, BreadcrumbList per article |
| Canonical URLs | All routes | Set via `metadata.alternates.canonical` |
| IndexNow ownership key | `/8d4d19978ecb4053356466d215588e77.txt` | Proves domain ownership to Bing/Yandex/Yep |
| IndexNow ping script | `npm run indexnow` | POSTs every sitemap URL to api.indexnow.org |
| Mobile viewport | `app/layout.tsx` | `viewport-fit=cover`, no zoom-blocking |
| Image optimization | Next.js `<Image>` everywhere | AVIF/WebP, responsive `srcset` |

## 2. First-time setup (do these once)

### Google Search Console
1. Go to <https://search.google.com/search-console>
2. *Add property* → choose **Domain** (not URL prefix) → enter `malakavenu.com`
3. Verify via DNS TXT record (your domain registrar). This is the single best signal you can give Google.
4. Once verified:
   - **Sitemaps** → submit `https://malakavenu.com/sitemap.xml`
   - **URL Inspection** → paste the homepage and any 2-3 high-value articles → click *Request indexing*
   - **Settings → Crawl rate** — leave on default
5. **Bookmark these reports** and check weekly:
   - *Performance* — clicks, impressions, CTR, average position per query
   - *Pages* (formerly *Coverage*) — which URLs are indexed vs excluded
   - *Core Web Vitals* — LCP / INP / CLS by URL group
   - *Enhancements → Mobile Usability* and *Article* (structured data)

### Bing Webmaster Tools
1. Go to <https://www.bing.com/webmasters> → sign in with Microsoft account
2. *Add a site* → `https://malakavenu.com`
3. *Import from Google Search Console* (one-click — easiest path) or verify via XML file
4. Submit `https://malakavenu.com/sitemap.xml`
5. Bing also powers **DuckDuckGo, Yahoo, ChatGPT search, Copilot** — this one verification covers ~30% of US search.

### IndexNow (already 80% set up — just enable the pings)
The codebase already publishes the ownership key at `/8d4d19978ecb4053356466d215588e77.txt`, which Bing, Yandex, Seznam, Naver, and Yep recognize.

After every deploy or new article:
```bash
npm run indexnow                    # ping every URL in the live sitemap
npm run indexnow -- /articles/foo   # ping a single URL
```

This typically gets non-Google engines to crawl within minutes instead of days. Add it to your deploy hook.

### Optional: Yandex Webmaster, Seznam (CZ), Naver (KR)
Only worth doing if you have audience in those regions. IndexNow already nudges them via the same key.

## 3. After every deploy or new article

```bash
# 1. Trigger IndexNow pings for Bing/Yandex/Yep/Naver/Seznam
npm run indexnow

# 2. (Optional, one-shot) Use Search Console's URL Inspection on the new article
#    https://search.google.com/search-console/inspect?resource_id=…
#    → "Request indexing" — useful for the first 5-10 articles to seed crawl
```

## 4. Schema / metadata sanity checks (one-off, before your first big push)

| Tool | Why |
|--|--|
| <https://search.google.com/test/rich-results> | Validates `BlogPosting` JSON-LD on each article |
| <https://www.opengraph.xyz/> or <https://www.linkedin.com/post-inspector/> | OG card preview for social shares |
| <https://cards-dev.twitter.com/validator> | X/Twitter card preview |
| <https://pagespeed.web.dev/> | Core Web Vitals + accessibility + SEO score per page |
| <https://search.google.com/test/mobile-friendly> | Mobile usability spot-check |

Run each on:
- Home (`/`)
- An article (`/articles/<latest>`)
- Resume (`/resume`)

## 5. Content-side SEO (what *you* control, not the code)

The site's technical SEO is solid — these are the levers that actually move rankings.

1. **Article slug = primary keyword.** The slug already becomes the canonical URL; pick keywords humans would search for, not catchy titles.
2. **Front-matter `description`** is the SERP snippet — write it as a one-sentence promise, 140-160 chars.
3. **First 100 words of the article** should mention the topic explicitly — that's where Google extracts featured-snippet candidates from.
4. **Internal linking.** When article B references a concept from article A, link it. Three internal links from a high-traffic article to a new one is the cheapest indexing nudge that exists.
5. **Link to the site from one external high-authority property.** Your LinkedIn profile, GitHub bio, X bio, Hacker News profile. One DR-90 backlink moves rankings more than 100 DR-20 ones.
6. **Update `updated:` front-matter** when you meaningfully revise an article. The sitemap surfaces `lastModified` — Google re-crawls fresher content faster.

## 6. Monitoring (weekly, ~10 min)

1. **Search Console → Performance**: any query with >50 impressions and CTR <2% — that's a snippet/title rewrite opportunity.
2. **Search Console → Pages**: anything in *Excluded → Discovered – currently not indexed* for >2 weeks → request indexing manually.
3. **Vercel Analytics → `attr_utm_source`** breakdown: confirms whether your share-link strategy is working.
4. **PageSpeed Insights** spot-check on the latest article: LCP <2.5s, INP <200ms, CLS <0.1.

## 7. Things to deliberately *not* do

- **Don't add `noindex` to anything** unless you intend it (the codebase doesn't, by design).
- **Don't unblock the AI bot list** in `app/robots.ts` unless you decide your content should train LLMs. Currently blocks GPTBot, ClaudeBot, PerplexityBot, etc. — this does *not* affect Google/Bing search crawling.
- **Don't keyword-stuff titles or alt text.** Modern ranking models penalize this.
- **Don't buy backlinks.** One real LinkedIn share of an article beats 100 paid links.
