'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { BrandMark } from './BrandMark';
import { SITE } from '@/lib/site';
import { track } from '@/lib/track';

type NavLink = { href: string; label: string; matchHash?: string };

const NAV_LINKS: NavLink[] = [
  { href: '/#about', label: 'About', matchHash: '#about' },
  { href: '/#skills', label: 'Skills', matchHash: '#skills' },
  { href: '/#experience', label: 'Experience', matchHash: '#experience' },
  { href: '/#portfolio', label: 'Case studies', matchHash: '#portfolio' },
  { href: '/playground', label: 'Playground' },
  { href: '/articles', label: 'Writing' },
  { href: '/#contact', label: 'Contact', matchHash: '#contact' },
];

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on Escape, and lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const isCurrent = (link: NavLink): boolean => {
    if (link.href === '/articles') return pathname?.startsWith('/articles') ?? false;
    if (link.href === '/playground') return pathname?.startsWith('/playground') ?? false;
    return false;
  };

  return (
    <header className={`nav${scrolled ? ' scrolled' : ''}`} id="navbar" role="banner">
      <div className="container nav-inner">
        <Link href="/" className="nav-brand" aria-label={`${SITE.name} — home`}>
          <BrandMark />
          <span className="brand-text" aria-hidden="true">
            Malaka<span className="grad">Venu</span>
          </span>
        </Link>

        <nav aria-label="Primary">
          <ul className={`nav-links${open ? ' open' : ''}`} id="navLinks">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={isCurrent(link) ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="nav-cta">
          <a
            href={SITE.resumePdf}
            target="_blank"
            rel="noopener"
            className="btn btn-ghost"
            onClick={() => track('resume_download', { location: 'header' })}
            aria-label="Download résumé (opens in new tab)"
          >
            <svg
              className="btn-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Resume
          </a>
          <button
            className="nav-toggle"
            id="navToggle"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="navLinks"
            onClick={() => setOpen((v) => !v)}
            type="button"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              {open ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
