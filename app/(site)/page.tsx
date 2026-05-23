import type { Metadata } from 'next';
import { JsonLd } from '@/components/site/JsonLd';
import { Hero } from '@/components/home/Hero';
import { TechMarquee } from '@/components/home/TechMarquee';
import { About } from '@/components/home/About';
import { Skills } from '@/components/home/Skills';
import { CaseStudies } from '@/components/home/CaseStudies';
import { Experience } from '@/components/home/Experience';
import { Education } from '@/components/home/Education';
import { Testimonials } from '@/components/home/Testimonials';
import { WritingTeaser } from '@/components/home/WritingTeaser';
import { AssistantPrompts } from '@/components/assistant/AssistantPrompts';
import { Contact } from '@/components/home/Contact';
import { breadcrumbLd, faqLd } from '@/lib/seo';
import { SITE } from '@/lib/site';

// FAQ entries mirror questions visible elsewhere on the page (About,
// Skills, Contact) — a Google requirement for FAQ rich-result eligibility.
const HOMEPAGE_FAQ = [
  {
    question: `Who is ${SITE.name}?`,
    answer:
      'Malaka Venugopal Reddy is an AI & Agentic Systems Engineer and Frontend Architect based in Bangalore, India. He has 11+ years of experience scaling Angular (v2 → v21) and React platforms, and currently builds agent skills, subagents and MCP servers on AWS Bedrock, OpenAI and Anthropic — woven into production frontends.',
  },
  {
    question: 'What does Malaka work on day-to-day?',
    answer:
      'Designing and shipping multi-agent systems on AWS Bedrock, building MCP servers and portable agent skills, and leading frontend architecture for enterprise Angular and React platforms — with a focus on streaming generative UI, design systems and developer experience.',
  },
  {
    question: 'What is an MCP server, and which ones has Malaka built?',
    answer:
      'MCP (Model Context Protocol) is an open standard from Anthropic for exposing tools and data to LLM agents over a portable wire protocol. Malaka has built and consumed MCP servers in production for design-system tooling (Figma → code), internal agent orchestrations on AWS Bedrock, and supervisor / subagent dispatch.',
  },
  {
    question: 'Is Malaka available for consulting or full-time roles?',
    answer: `Yes — Malaka takes on selected consulting engagements around AI/agentic systems engineering, frontend architecture, and design-systems strategy. The fastest paths to reach him are email (${SITE.email}) and LinkedIn (${SITE.socials.linkedin}).`,
  },
  {
    question: 'Where is Malaka based?',
    answer: `${SITE.location.locality}, ${SITE.location.region}, India — working remotely with global teams.`,
  },
];

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export const revalidate = 3600;

export default function HomePage() {
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: 'Home', url: SITE.url + '/' }])} />
      <JsonLd data={faqLd(HOMEPAGE_FAQ)} />
      <Hero />
      <TechMarquee />
      <About />
      <Skills />
      <CaseStudies />
      <Experience />
      <Education />
      <Testimonials />
      <WritingTeaser />
      <AssistantPrompts />
      <Contact />
    </>
  );
}
