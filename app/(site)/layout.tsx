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
      <ScrollProgress />
      <Header />
      <main>{children}</main>
      <Footer />
      <MobileDock />
    </>
  );
}
