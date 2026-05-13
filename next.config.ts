import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // Ensure MDX article sources are packaged into serverless bundles that
  // read them at request time (sitemap, rss). Next's file tracer can't
  // always resolve fs.readdir(process.cwd(), 'content', 'articles') paths,
  // so we include them explicitly to prevent cold-invocation 500s.
  outputFileTracingIncludes: {
    '/sitemap.xml': ['./content/articles/**/*.mdx'],
    '/rss.xml': ['./content/articles/**/*.mdx'],
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'malakavenu.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/Malaka_Venugopal_Reddy-2026.pdf',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, immutable' }],
      },
      {
        source: '/images/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Pre-baked article narration. Each MP3 is content-addressed by
        // slug — once published it never changes (re-bakes overwrite the
        // same path). Aggressive immutable caching keeps Vercel Hobby
        // bandwidth flat: each article downloads once per browser, once
        // per CDN edge region. The HEAD probe in useArticleTTS gets the
        // same cache treatment.
        source: '/audio/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.malakavenu.com' }],
        destination: 'https://malakavenu.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: '(?<sub>.*)\\.vercel\\.app' }],
        destination: 'https://malakavenu.com/:path*',
        permanent: true,
      },
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/articles.html', destination: '/articles', permanent: true },
      { source: '/resume.html', destination: '/resume', permanent: true },
      { source: '/articles/:slug.html', destination: '/articles/:slug', permanent: true },
    ];
  },
};

export default nextConfig;
