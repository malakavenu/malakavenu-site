#!/usr/bin/env node
// Pings the IndexNow protocol (Bing, Yandex, Seznam, Naver, Yep) with every
// URL from the live sitemap.xml. Run after a deploy to nudge instant indexing.
//
// Usage:
//   npm run indexnow                 # pings all sitemap URLs
//   npm run indexnow -- /articles/x  # pings a single URL (or comma-separated list)
//
// Docs: https://www.indexnow.org/documentation

const HOST = 'malakavenu.com';
const KEY = '8d4d19978ecb4053356466d215588e77';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const SITEMAP_URL = `https://${HOST}/sitemap.xml`;
const ENDPOINT = 'https://api.indexnow.org/IndexNow';

async function fetchSitemapUrls() {
  const res = await fetch(SITEMAP_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].trim());
}

async function ping(urlList) {
  const body = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList };
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  const text = await res.text().catch(() => '');
  return { status: res.status, body: text };
}

async function main() {
  const argOverride = process.argv.slice(2).filter(Boolean);
  let urls;

  if (argOverride.length > 0) {
    urls = argOverride.flatMap((arg) =>
      arg.split(',').map((p) => (p.startsWith('http') ? p : `https://${HOST}${p.startsWith('/') ? p : `/${p}`}`)),
    );
  } else {
    urls = await fetchSitemapUrls();
  }

  if (urls.length === 0) {
    console.error('No URLs to submit.');
    process.exit(1);
  }

  // IndexNow allows up to 10,000 URLs per call; we batch at 1,000 for safety.
  const chunk = 1000;
  let totalOk = 0;
  for (let i = 0; i < urls.length; i += chunk) {
    const batch = urls.slice(i, i + chunk);
    const { status, body } = await ping(batch);
    const ok = status >= 200 && status < 300;
    console.log(`batch ${i / chunk + 1}: ${batch.length} urls -> status=${status}${body ? ` body=${body}` : ''}`);
    if (ok) totalOk += batch.length;
  }

  console.log(`\nSubmitted ${totalOk}/${urls.length} URLs to IndexNow.`);
  console.log(`Key location: ${KEY_LOCATION}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
