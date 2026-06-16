'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { MemeStudioConfig, PanelId } from '../types';
import { MemeStudioProvider } from './MemeStudioContext';
import { FeedPanel } from './panels/FeedPanel';
import { StudioPanel } from './panels/StudioPanel';
import { HistoryPanel } from './panels/HistoryPanel';
import { ConsentNote } from './shared/ConsentNote';
import { MemeStudioErrorBoundary } from './shared/ErrorBoundary';
import { HistoryIcon, IdeasIcon, StudioIcon } from './shared/Icons';
import styles from '../styles/meme-studio.module.css';

const NAV: { id: PanelId; label: string; Icon: typeof IdeasIcon }[] = [
  { id: 'feed', label: 'Feed', Icon: IdeasIcon },
  { id: 'studio', label: 'Studio', Icon: StudioIcon },
  { id: 'history', label: 'History', Icon: HistoryIcon },
];

export function MemeStudio({ config }: { config: MemeStudioConfig }) {
  return (
    <MemeStudioErrorBoundary>
      <MemeStudioProvider config={config}>
        <MemeStudioShell />
      </MemeStudioProvider>
    </MemeStudioErrorBoundary>
  );
}

function MemeStudioShell() {
  const [active, setActive] = useState<PanelId>('feed');

  return (
    <div className={styles.root} data-theme="dark">
      <div className={styles.bgGlowA} aria-hidden />
      <div className={styles.bgGlowB} aria-hidden />

      {/* ── Top app bar ─────────────────────────────────────────────────── */}
      <header className={styles.topBar}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandText}>Meme Studio</span>
        </Link>

        <nav className={styles.topNav} aria-label="Primary">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`${styles.topNavItem} ${active === id ? styles.topNavItemActive : ''}`}
              aria-current={active === id ? 'page' : undefined}
              onClick={() => setActive(id)}
            >
              <Icon width={16} height={16} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.topMeta} />
      </header>

      {/* ── Active view ─────────────────────────────────────────────────── */}
      <main className={styles.viewport}>
        <MemeStudioErrorBoundary>
          {active === 'feed' && <FeedPanel onEdit={() => setActive('studio')} />}
          {active === 'studio' && <StudioPanel />}
          {active === 'history' && <HistoryPanel />}
        </MemeStudioErrorBoundary>
        <ConsentNote />
      </main>

      {/* ── Mobile bottom nav ───────────────────────────────────────────── */}
      <nav className={styles.bottomNav} aria-label="Sections">
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`${styles.bottomNavItem} ${active === id ? styles.bottomNavActive : ''}`}
            aria-current={active === id ? 'page' : undefined}
            onClick={() => setActive(id)}
            aria-label={label}
          >
            <Icon width={20} height={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
