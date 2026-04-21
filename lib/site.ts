const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const siteUrl = (rawSiteUrl && rawSiteUrl.length > 0 ? rawSiteUrl : 'https://malakavenu.com').replace(/\/+$/, '');

export const SITE = {
  url: siteUrl,
  name: 'Malaka Venugopal Reddy',
  shortName: 'Malaka Venu',
  title: 'Malaka Venugopal Reddy — AI & Agentic Systems Engineer · Frontend Architect',
  description:
    'AI & Agentic Systems Engineer building agent skills, subagents and MCP servers on AWS Bedrock, OpenAI & Anthropic — woven into production frontends. 11+ years scaling Angular (v2 → v21) & React platforms and driving design-systems strategy.',
  shortDescription:
    'Building agent skills, subagents & MCP servers on AWS Bedrock, OpenAI & Anthropic — woven into production frontends.',
  email: 'venu.malaka@gmail.com',
  phone: '+91-99404-50062',
  locale: 'en-US',
  themeColor: '#0c0e16',
  backgroundColor: '#07080d',
  twitterHandle: '@malakavenu',
  location: {
    locality: 'Bangalore',
    region: 'Karnataka',
    country: 'IN',
  },
  socials: {
    linkedin: 'https://www.linkedin.com/in/venumalaka',
    github: 'https://github.com/malakavenu',
    x: 'https://x.com/malakavenu',
    facebook: 'https://www.facebook.com/profile.php?id=61567201912996',
  },
  nav: [
    { href: '/#about', label: 'About' },
    { href: '/#skills', label: 'Skills' },
    { href: '/#work', label: 'Work' },
    { href: '/articles', label: 'Writing' },
    { href: '/resume', label: 'Resume' },
    { href: '/#contact', label: 'Contact' },
  ],
  ogImage: '/opengraph-image',
  resumePdf: '/Malaka_Venugopal_Reddy.pdf',
  giscus: {
    repo: process.env.NEXT_PUBLIC_GISCUS_REPO ?? '',
    repoId: process.env.NEXT_PUBLIC_GISCUS_REPO_ID ?? '',
    category: process.env.NEXT_PUBLIC_GISCUS_CATEGORY ?? 'General',
    categoryId: process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID ?? '',
  },
} as const;

export type Site = typeof SITE;
