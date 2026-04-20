'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BrandMark } from './BrandMark';
import { SITE } from '@/lib/site';
import { track } from '@/lib/track';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`nav${scrolled ? ' scrolled' : ''}`} id="navbar">
      <div className="container nav-inner">
        <Link href="/" className="nav-brand" aria-label={`${SITE.name} — home`}>
          <BrandMark />
          <span className="brand-text">
            Malaka<span className="grad">Venu</span>
          </span>
        </Link>

        <nav>
          <ul className={`nav-links${open ? ' open' : ''}`} id="navLinks">
            <li>
              <Link href="/#about" onClick={() => setOpen(false)}>
                About
              </Link>
            </li>
            <li>
              <Link href="/#skills" onClick={() => setOpen(false)}>
                Skills
              </Link>
            </li>
            <li>
              <Link href="/#experience" onClick={() => setOpen(false)}>
                Experience
              </Link>
            </li>
            <li>
              <Link href="/#portfolio" onClick={() => setOpen(false)}>
                Case studies
              </Link>
            </li>
            <li>
              <Link href="/articles" onClick={() => setOpen(false)}>
                Writing
              </Link>
            </li>
            <li>
              <Link href="/#contact" onClick={() => setOpen(false)}>
                Contact
              </Link>
            </li>
          </ul>
        </nav>

        <div className="nav-cta">
          <a
            href={SITE.resumePdf}
            target="_blank"
            rel="noopener"
            className="btn btn-ghost"
            onClick={() => track('resume_download', { location: 'header' })}
          >
            <svg
              className="btn-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
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
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
