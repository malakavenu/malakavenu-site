'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SITE } from '@/lib/site';
import { track } from '@/lib/track';

const SECTION_IDS = ['home', 'skills', 'writing', 'contact'] as const;

export function MobileDock() {
  const pathname = usePathname();
  const onHome = pathname === '/';
  const [active, setActive] = useState<string>('home');

  useEffect(() => {
    if (!onHome) return;
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
          .slice(0, 1)
          .forEach((e) => setActive(e.target.id));
      },
      { rootMargin: '-30% 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [onHome]);

  const itemCls = (id: string, extra = '') =>
    `dock-item${extra ? ' ' + extra : ''}${onHome && active === id ? ' active' : ''}`;

  return (
    <nav className="mobile-dock" id="mobileDock" aria-label="Mobile quick navigation">
      <div className="mobile-dock-inner">
        <Link href="/#home" className={itemCls('home')} aria-label="Home" data-section="home">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9.5 12 3l9 6.5" />
            <path d="M5 9v11h14V9" />
          </svg>
          <span>Home</span>
        </Link>
        <Link href="/#skills" className={itemCls('skills')} aria-label="Skills" data-section="skills">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
          </svg>
          <span>Skills</span>
        </Link>
        <Link href="/articles" className={itemCls('writing')} aria-label="Writing" data-section="writing">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h12l4 4v12a0 0 0 0 1 0 0H4z" />
            <path d="M16 4v4h4" />
            <path d="M8 13h8M8 17h6" />
          </svg>
          <span>Writing</span>
        </Link>
        <a
          href={SITE.resumePdf}
          target="_blank"
          rel="noopener"
          className={itemCls('resume', 'dock-cta')}
          aria-label="Download resume"
          onClick={() => track('resume_download', { location: 'mobile_dock' })}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Resume</span>
        </a>
        <Link href="/#contact" className={itemCls('contact')} aria-label="Contact" data-section="contact">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          <span>Contact</span>
        </Link>
      </div>
    </nav>
  );
}
