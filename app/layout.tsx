import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { SITE } from '@/lib/site';
import { buildMetadata, personLd, websiteLd, professionalServiceLd } from '@/lib/seo';
import { JsonLd } from '@/components/site/JsonLd';
import { AssistantProvider } from '@/components/assistant/AssistantContext';
import { AssistantLauncher } from '@/components/assistant/AssistantLauncher';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  ...buildMetadata({ path: '/' }),
  title: { default: SITE.title, template: `%s — ${SITE.name}` },
  applicationName: SITE.shortName,
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  generator: 'Next.js',
  category: 'technology',
  keywords: [
    SITE.name,
    'AI Engineer',
    'AI Agentic Systems',
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
    'RAG',
    'Generative UI',
    'LLM Engineering',
    'Frontend Architect',
    'Angular Architect',
    'React Architect',
    'Design Systems',
    'Bangalore',
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: SITE.shortName,
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: SITE.themeColor,
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        <AssistantProvider>
          {children}
          <AssistantLauncher />
        </AssistantProvider>
        <JsonLd data={[personLd, websiteLd, professionalServiceLd]} />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
