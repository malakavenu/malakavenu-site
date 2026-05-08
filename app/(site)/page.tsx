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
import { breadcrumbLd, professionalServiceLd } from '@/lib/seo';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export const revalidate = 3600;

export default function HomePage() {
  return (
    <>
      <JsonLd data={professionalServiceLd} />
      <JsonLd data={breadcrumbLd([{ name: 'Home', url: SITE.url + '/' }])} />
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
