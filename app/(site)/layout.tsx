import { Suspense } from 'react';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { MobileDock } from '@/components/site/MobileDock';
import { ScrollProgress } from '@/components/site/ScrollProgress';
import { AttributionBoot } from '@/components/site/AttributionBoot';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <AttributionBoot />
      </Suspense>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <ScrollProgress />
      <Header />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer />
      <MobileDock />
    </>
  );
}
