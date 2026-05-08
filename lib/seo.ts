import type { Metadata } from 'next';
import { SITE } from './site';

type BuildMetadataInput = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article' | 'profile';
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
  noIndex?: boolean;
};

export function buildMetadata({
  title,
  description,
  path = '/',
  image,
  type = 'website',
  publishedTime,
  modifiedTime,
  tags,
  noIndex = false,
}: BuildMetadataInput = {}): Metadata {
  const url = `${SITE.url}${path}`;
  const finalTitle = title ?? SITE.title;
  const finalDescription = description ?? SITE.description;
  const finalImage = image ?? `${SITE.url}/images/og-image.png`;

  return {
    title: title ?? { absolute: SITE.title },
    description: finalDescription,
    alternates: {
      canonical: url,
      languages: { en: url, 'x-default': url },
      types: { 'application/rss+xml': `${SITE.url}/rss.xml` },
    },
    openGraph: {
      type,
      url,
      siteName: SITE.name,
      locale: 'en_US',
      title: finalTitle,
      description: finalDescription,
      images: [
        {
          url: finalImage,
          width: 1200,
          height: 630,
          alt: finalTitle,
          type: 'image/png',
        },
      ],
      ...(type === 'article' && publishedTime ? { publishedTime } : {}),
      ...(type === 'article' && modifiedTime ? { modifiedTime } : {}),
      ...(type === 'article' && tags ? { tags } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      site: SITE.twitterHandle,
      creator: SITE.twitterHandle,
      title: finalTitle,
      description: finalDescription,
      images: [finalImage],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
    other: {
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'black-translucent',
      'apple-mobile-web-app-title': SITE.shortName,
    },
    icons: {
      icon: [
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/images/favicon-32.png', sizes: '32x32', type: 'image/png' },
        { url: '/images/icon-192.png', sizes: '192x192', type: 'image/png' },
      ],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
      shortcut: ['/favicon.svg'],
    },
    manifest: '/manifest.webmanifest',
  };
}

/* ---------- JSON-LD builders ---------- */

export const personLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': `${SITE.url}/#person`,
  name: SITE.name,
  alternateName: ['Malaka Venu', 'Venu Malaka'],
  url: `${SITE.url}/`,
  image: `${SITE.url}/images/hero-2026.jpg`,
  jobTitle: 'AI & Agentic Systems Engineer · Frontend Architect',
  description: SITE.description,
  email: `mailto:${SITE.email}`,
  telephone: SITE.phone,
  gender: 'Male',
  nationality: { '@type': 'Country', name: 'India' },
  address: {
    '@type': 'PostalAddress',
    addressLocality: SITE.location.locality,
    addressRegion: SITE.location.region,
    addressCountry: SITE.location.country,
  },
  knowsAbout: [
    'AI Engineering',
    'Agentic Systems',
    'Agent Skills',
    'Subagents',
    'MCP Servers',
    'Model Context Protocol',
    'Multi-Agent Orchestration',
    'AWS Bedrock',
    'Anthropic Claude',
    'OpenAI',
    'LangChain',
    'LangGraph',
    'Retrieval-Augmented Generation',
    'Generative UI',
    'AI Evals & Observability',
    'LLM Engineering',
    'Frontend Architecture',
    'Angular',
    'React',
    'TypeScript',
    'Micro-Frontends',
    'Module Federation',
    'Nx Monorepo',
    'Design Systems',
    'Design Tokens',
    'Web Components',
    'Storybook',
    'Frontend Platform Engineering',
    'Web Performance',
    'Accessibility (WCAG 2.2)',
  ],
  knowsLanguage: ['English', 'Telugu', 'Hindi'],
  alumniOf: [
    {
      '@type': 'CollegeOrUniversity',
      name: 'Jawaharlal Nehru Technological University, Anantapur',
      sameAs: 'https://en.wikipedia.org/wiki/Jawaharlal_Nehru_Technological_University,_Anantapur',
    },
  ],
  sameAs: [
    SITE.socials.linkedin,
    SITE.socials.github,
    SITE.socials.x,
    SITE.socials.facebook,
  ],
};

export const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE.url}/#website`,
  url: `${SITE.url}/`,
  name: `${SITE.name} — Portfolio`,
  description:
    'Portfolio and writing of Malaka Venugopal Reddy — AI & Agentic Systems Engineer, Frontend Architect, Design Systems Strategist.',
  publisher: { '@id': `${SITE.url}/#person` },
  inLanguage: 'en-US',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE.url}/articles?topic={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

export const professionalServiceLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  '@id': `${SITE.url}/#service`,
  name: `${SITE.name} — Frontend Architecture & AI Engineering`,
  url: `${SITE.url}/`,
  image: `${SITE.url}/images/og-image.png`,
  description:
    'Frontend architecture, AI & agentic systems engineering, and design-systems strategy for product organizations.',
  founder: { '@id': `${SITE.url}/#person` },
  areaServed: 'Worldwide',
  address: {
    '@type': 'PostalAddress',
    addressLocality: SITE.location.locality,
    addressRegion: SITE.location.region,
    addressCountry: SITE.location.country,
  },
  serviceType: [
    'Frontend Architecture Consulting',
    'AI & Agentic Systems Engineering',
    'Design Systems Strategy',
    'Frontend Platform Engineering',
  ],
  priceRange: '$$$',
};

export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function blogLd(articles: { slug: string; title: string; publishedAt: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${SITE.url}/articles#blog`,
    url: `${SITE.url}/articles`,
    name: `${SITE.name} — Writing`,
    description:
      'Field notes on AI engineering, agentic systems, MCP servers, and frontend architecture.',
    inLanguage: 'en-US',
    publisher: { '@id': `${SITE.url}/#person` },
    blogPost: articles.map((a) => ({
      '@type': 'BlogPosting',
      headline: a.title,
      url: `${SITE.url}/articles/${a.slug}`,
      datePublished: a.publishedAt,
    })),
  };
}

export function blogPostingLd(article: {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  tags?: string[];
  wordCount?: number;
}) {
  const url = `${SITE.url}/articles/${article.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: article.title,
    description: article.description,
    url,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    inLanguage: 'en-US',
    keywords: article.tags?.join(', '),
    wordCount: article.wordCount,
    image: `${url}/og`,
    author: { '@id': `${SITE.url}/#person` },
    publisher: { '@id': `${SITE.url}/#person` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };
}

export function profilePageLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${SITE.url}/resume#profile`,
    url: `${SITE.url}/resume`,
    name: `${SITE.name} — Resume`,
    about: { '@id': `${SITE.url}/#person` },
    primaryImageOfPage: `${SITE.url}/images/hero-2026.jpg`,
  };
}
