# Backlinks Playbook — malakavenu.com

A ranked, executable list of backlink opportunities. Work top-down — **a single high-DA link from §1 outranks 50 from §4**.

> **Rule of one**: do *one* item per session, not all of them. SEO is a slow-rising tide; a five-hour binge produces footprint patterns that look unnatural to Google.

---

## 1. Your own high-DA properties (do this week — DA 90+, free, irreversible compounding)

These are the cheapest, highest-leverage links you'll ever get. Each takes <5 min.

| Property | Where exactly | Anchor / link to | Notes |
|--|--|--|--|
| **LinkedIn profile** | *Contact info → Website* | `https://malakavenu.com` (label: "Personal site") | Already a `dofollow` from `linkedin.com` (DA 98) |
| **LinkedIn featured** | *Profile → Featured → Add link* | Pin 2-3 marquee articles | Each becomes its own DA-98 backlink |
| **GitHub profile bio** | github.com/malakavenu → Edit profile | `https://malakavenu.com` | DA 96, dofollow |
| **GitHub README repo** | Create `malakavenu/malakavenu` repo with `README.md` | Link site, articles, RSS | Special "profile README" — shows on profile, gets crawled |
| **X/Twitter bio** | Edit profile → Website | `https://malakavenu.com` | nofollow but real referral traffic |
| **Stack Overflow profile** | Edit profile → Website | `https://malakavenu.com` | DA 92 |
| **dev.to profile** | Settings → Website URL | `https://malakavenu.com` | DA 89, also republish 2-3 articles with `canonical_url` pointing back |
| **Medium profile** | Settings → Profile → Custom links | `https://malakavenu.com` | DA 95, republish with rel=canonical |
| **Hacker News bio** | news.ycombinator.com → user → about | `https://malakavenu.com` | DA 89 |
| **Hashnode profile** | Settings → Personal site | `https://malakavenu.com` | DA 78, dev community |
| **Product Hunt maker profile** | Profile → website | `https://malakavenu.com` | DA 91 |
| **Indie Hackers profile** | Profile → website | `https://malakavenu.com` | DA 76 |
| **AngelList / Wellfound** | Profile website field | `https://malakavenu.com` | DA 89 |
| **Read.cv** | Profile → Website | `https://malakavenu.com` | Designer / engineer audience |
| **Polywork / Cord** | Same | `https://malakavenu.com` | Niche but indexed |
| **Mastodon profile** (any instance) | Profile → Edit → Verification | Add `<a rel="me" href="https://your-mastodon-handle">` to your site, paste profile URL in your Mastodon "metadata" — gives a green checkmark *and* an indexed `rel=me` link both ways |

**Acceptance check:** type `link:malakavenu.com` into Google after a week. You should see 8-15 of these indexed.

---

## 2. Republish-with-canonical (do this month — DA 85+, no SEO penalty)

Publishing the **same article** on a high-DA platform with `<link rel="canonical" href="https://malakavenu.com/articles/...">` does **not** trigger duplicate-content penalties (this is documented Google behavior). You get the platform's reach + a backlink to the canonical, while Google credits ranking signals to your site.

Best targets (in order):

1. **dev.to** — `canonical_url:` field in front-matter. ~5M monthly devs. Use it for AI/agent + frontend articles.
2. **Hashnode** — toggle "This is a republished article" → paste canonical. Tight dev audience.
3. **Medium** — *Story settings → Advanced settings → Set canonical URL* (only available after you've published once). High DA, weaker dev audience.
4. **LinkedIn Articles** (not posts) — *Add canonical link* in the "more" menu. Native LinkedIn distribution + a `linkedin.com/pulse/...` URL pointing to your canonical.
5. **Substack Notes / personal Substack** (only if you start one) — same pattern.

**Cadence:** republish one essay per platform per month. Always wait 1-2 weeks after the original publishes so Google indexes your version first.

---

## 3. Niche directories & curated lists (do once — DA 50-80, evergreen)

Submit once; the link sits there forever.

### AI / agentic engineering
- **Awesome-LLM** GitHub list — submit a PR adding your `agent-skills-patterns` or `mcp-server-design` essay
- **Awesome-MCP** GitHub list — submit your MCP article
- **Awesome-LangChain**, **Awesome-Bedrock** — same pattern
- **There's an AI for that** (theresanaiforthat.com) — submit if/when you ship a public agent
- **Futuretools.io** — directory submission
- **AItoolsdirectory.com**

### Frontend & design systems
- **awesome-design-systems** GitHub list — submit your design-tokens essay
- **awesome-angular** GitHub list — submit your Angular 21 essay
- **awesome-react** — same
- **uxtools.co** newsletter / list — pitch a guest essay
- **Component Gallery** (componentgallery.app) — link if you publish design-system components

### Personal / portfolio
- **Read.cv directory** — public portfolio
- **Awwwards.com** — submit the site (nominal fee but huge designer credibility + dofollow if featured)
- **CSSDesignAwards** — same
- **Httpster.net** — site curation, free

**Each PR / submission:** mention the article briefly in the description, link the canonical URL, no anchor manipulation.

---

## 4. Active outreach (do quarterly — variable DA, real conversations)

These are the slowest but produce the best backlinks because they come with editorial endorsement.

### Newsletter inclusion
Pitch one essay per quarter to:
- **Bytes** (`bytes.dev`) — frontend
- **JavaScript Weekly** (`javascriptweekly.com`)
- **React Status** (`react.statuscode.com`)
- **Frontend Focus** (`frontendfoc.us`)
- **TLDR AI** (`tldr.tech/ai`)
- **The Batch** (deeplearning.ai)
- **Latent Space** (`latent.space`)
- **AI Engineer** (`ai.engineer`)

**Pitch template** (one paragraph max — they get hundreds):

> Hi {editor first name}, big fan of {recent issue}. I just published "{title}" — {one-line angle}, with a concrete example from a {scale} production system. Direct link: {url}. Happy to provide a 2-line summary in your format if useful.

### Podcast / interview
Pitch yourself as a guest to:
- **The Changelog** (`changelog.com`)
- **Frontend Happy Hour**
- **JS Party**
- **Latent Space podcast**
- **Cognitive Revolution**
- **Practical AI**

Show notes always include guest links → automatic backlink + audience.

### Conference talks (highest leverage long-term)
A single accepted CFP gives you the conference site backlink, the talk page, slides, and YouTube — plus authority signal. Target:
- **AI Engineer Summit / Conference**
- **NDC London / Oslo / Sydney** (frontend)
- **JSWorld / Angular Connect / React Summit**
- **MCP Summit** (when announced)
- **Fragment / Config** (Figma) — for the design-system MCP angle

---

## 5. The HARO / SourceBottle approach (low effort, ongoing)

- **Help a Reporter Out** (`helpareporter.com`) — daily journalist queries
- **Connectively** (HARO replacement)
- **Featured.com / Help a B2B Writer**
- **Qwoted**

Filter for queries about AI / agents / frontend / design systems. Reply with a 100-word expert quote + your site URL. Hit rate is ~5% but every win is an editorially-placed dofollow link from a real publication.

---

## 6. Linkable assets you already have

Each of these is "link bait" — content other people will cite without being asked:

| Asset on your site | Pitch it as |
|--|--|
| `/articles/figma-mcp-design-system-aware` | The reference essay on DS-aware MCPs — pitch to design-system newsletters |
| `/articles/subagents-in-production` | War-story essay — pitch to AI engineering newsletters |
| `/articles/mcp-server-design` | Reference architecture — pitch to Anthropic's community channels, MCP Discord |
| Angular v2→v21 timeline (in `/#work`) | Visual asset — pitch as a guest post to Angular newsletters |
| `/playground` (live demo) | Show HN candidate (see §7) |

---

## 7. Show HN / Reddit launch (one shot per asset)

A successful Show HN regularly produces 50-200 backlinks within a week (every blog summarizing it links you).

- **Show HN**: only post when something is *demoably new* (the playground, the AI assistant, a new MCP). Don't post the homepage.
- **Title format**: `Show HN: {what} — {one-line outcome}`. Example: `Show HN: A Figma → code MCP that's actually design-system aware`
- **r/MachineLearning** [P] tag for project posts
- **r/LocalLLaMA** if you ship anything self-hostable
- **r/programming**, **r/webdev**, **r/Angular2**, **r/reactjs** — only when the post is genuinely useful, not promotional

Each successful launch is worth 6 months of cold outreach.

---

## 8. What to *avoid*

- **Paid links / link-farm "DA80 guest posts" on Fiverr** — Google's spam team is calibrated for these in 2026 and the penalty is real.
- **Reciprocal link rings** ("I'll link you if you link me" coordinated with strangers).
- **Comment spam** on blogs / forums.
- **Footer-of-every-page sitewide links** from a friend's site — looks unnatural.
- **Exact-match anchor text everywhere** ("AI Engineer Bangalore"). Vary anchors: brand name, URL, "Malaka's essay on X", "this piece".

---

## 9. Tracking what's working

Free stack — no need for Ahrefs unless you go pro:

- **Google Search Console → Links report** — shows top linking sites & top linked pages, refreshed every few days. *This is the only source you need for the first year.*
- **Bing Webmaster Tools → Backlinks** — Bing's index is different from Google's; it often catches links GSC misses for weeks.
- **`link:malakavenu.com`** Google search — quick spot-check.
- **Vercel Analytics → Referrers** — tells you which links are actually sending humans (the only metric that matters long-term).

If you want a paid tool for one month to do a competitive audit, **Ahrefs Webmaster Tools is free** for verified domains and gives you 100 link checks/day.

---

## 10. 12-week starter sprint

A realistic schedule for someone with a day job:

| Week | Action |
|--|--|
| 1 | All of §1 (5 min × 15 properties) |
| 2 | Submit `sitemap.xml` to GSC & Bing; verify domain on both |
| 3 | Republish marquee article #1 to dev.to with canonical |
| 4 | Republish marquee article #2 to Hashnode with canonical |
| 5 | Submit to 3 awesome-* GitHub lists (§3) |
| 6 | Pitch 1 newsletter (§4) |
| 7 | LinkedIn Article version of marquee article #3 |
| 8 | First HARO / Featured.com round — 3 expert quotes |
| 9 | Second newsletter pitch + Reddit launch of /playground |
| 10 | Submit to Awwwards / Httpster / Read.cv |
| 11 | Pitch 1 podcast appearance |
| 12 | Audit GSC Links report → identify what worked → double down next quarter |

Expected outcome at week 12: **40-80 referring domains**, 1-2 of them DR 80+, and measurable organic traffic growth in GSC.
