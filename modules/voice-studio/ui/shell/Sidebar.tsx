'use client';

/**
 * Voice Studio Sidebar — vertical navigation rail.
 *
 * Replaces the previous top-tab + footer layout. Houses:
 *   - Brand logo + name
 *   - Panel navigation (with icon + active-state pill)
 *   - Language picker (compact button that opens a sheet)
 *   - Settings cluster (theme toggle + HF Boost)
 *   - Quick history strip
 *
 * Collapsible: 240 px expanded → 72 px icon-only. State persists to localStorage.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { LanguageCode, PanelId, VoiceStudioConfig } from '../../types';
import { LANGUAGES } from '../../config';
import { LanguagePicker } from '../LanguagePicker';
import { HfBoostToggle } from '../shared/HfBoostToggle';
import { ThemeToggle } from './ThemeToggle';
import { SpaceStatus, type SpaceInfo } from '../shared/SpaceStatus';
import styles from '../../styles/voice-studio.module.css';

const STORAGE_KEY = 'voiceStudio.sidebarCollapsed';

function readInitialCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

interface SidebarProps {
  language: LanguageCode;
  onChangeLanguage: (next: LanguageCode) => void;
  activePanel: PanelId;
  onChangePanel: (id: PanelId) => void;
  panels: { id: PanelId; label: string }[];
  config: VoiceStudioConfig;
  spaces: SpaceInfo[];
  onRefreshStatus: () => void;
}

const PANEL_ICONS: Record<PanelId, ReactNode> = {
  'news-reader': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
      <path d="M4 22V4a2 2 0 0 1 2-2h11l3 3v17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M8 8h8M8 12h8M8 16h6" />
    </svg>
  ),
  'voice-clone': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 22a8 8 0 0 1 16 0" />
      <path d="M16 8l4-4M20 8l-4-4" />
    </svg>
  ),
  'voice-convert': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
      <path d="M3 12h12l-3-3M21 12H9l3 3" />
    </svg>
  ),
  'translate-speak': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
      <path d="M5 8l6 6" />
      <path d="M4 14l6-6 2-3" />
      <path d="M2 5h12" />
      <path d="M7 2h1" />
      <path d="M22 22l-5-10-5 10" />
      <path d="M14 18h6" />
    </svg>
  ),
};

export function Sidebar({
  language,
  onChangeLanguage,
  activePanel,
  onChangePanel,
  panels,
  config,
  spaces,
  onRefreshStatus,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState<boolean>(readInitialCollapsed);
  const [langSheetOpen, setLangSheetOpen] = useState(false);
  // Drawer mode is mobile-only — the corresponding CSS rules are gated by a
  // @media query, so on desktop this state has no visual effect and the
  // sidebar always renders inline.
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Close the drawer when the user picks a panel or language — feels far
  // more natural on mobile than leaving the drawer pinned open.
  const handlePanelChange = useCallback(
    (id: PanelId) => {
      onChangePanel(id);
      closeDrawer();
    },
    [onChangePanel, closeDrawer]
  );

  // Escape key closes the drawer when it's open.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, closeDrawer]);

  const currentLangLabel = LANGUAGES[language]?.label ?? language;

  return (
    <>
      {/* Hamburger trigger — mobile-only, fixed top-left of the viewport.
          Hidden via CSS on desktop. */}
      <button
        type="button"
        className={styles.sidebarMobileTrigger}
        onClick={() => setDrawerOpen(true)}
        aria-label="Open navigation"
        aria-controls="voice-studio-sidebar"
        aria-expanded={drawerOpen}
      >
        <HamburgerIcon />
      </button>

      {drawerOpen && (
        <button
          type="button"
          className={styles.sidebarDrawerBackdrop}
          onClick={closeDrawer}
          aria-label="Close navigation"
        />
      )}

      <aside
        id="voice-studio-sidebar"
        className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''} ${drawerOpen ? styles.sidebarDrawerOpen : ''}`}
        aria-label="Voice Studio navigation"
      >
        <div className={styles.sidebarHeader}>
          <Link
            href="/"
            className={styles.sidebarBrand}
            aria-label="Home"
            onClick={closeDrawer}
          >
            <span className={styles.sidebarLogo}>
              <BrandMark />
            </span>
            {!collapsed && (
              <span className={styles.sidebarBrandText}>
                <span className={styles.sidebarBrandTitle}>Voice Studio</span>
                <span className={styles.sidebarBrandSub}>Indic-first · free</span>
              </span>
            )}
          </Link>
          <button
            type="button"
            className={styles.sidebarCollapseBtn}
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" width="14" height="14" aria-hidden="true">
              {collapsed ? (
                <polyline points="9 18 15 12 9 6" />
              ) : (
                <polyline points="15 18 9 12 15 6" />
              )}
            </svg>
          </button>
          {/* Close button — only visible inside the mobile drawer. */}
          <button
            type="button"
            className={styles.sidebarDrawerClose}
            onClick={closeDrawer}
            aria-label="Close navigation"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className={styles.sidebarNav} aria-label="Panels">
          {panels.map((p) => {
            const active = activePanel === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className={`${styles.sidebarNavItem} ${active ? styles.sidebarNavItemActive : ''}`}
                onClick={() => handlePanelChange(p.id)}
                title={p.label}
                aria-current={active ? 'page' : undefined}
              >
                <span className={styles.sidebarNavIcon}>{PANEL_ICONS[p.id]}</span>
                {!collapsed && <span className={styles.sidebarNavLabel}>{p.label}</span>}
                {active && <span className={styles.sidebarNavPill} aria-hidden="true" />}
              </button>
            );
          })}
        </nav>

        <div className={styles.sidebarSection}>
          {!collapsed && <span className={styles.sidebarSectionTitle}>Language</span>}
          <button
            type="button"
            className={styles.sidebarLangBtn}
            onClick={() => setLangSheetOpen(true)}
            title={currentLangLabel}
          >
            <span className={styles.sidebarLangChip}>
              <GlobeIcon />
            </span>
            {!collapsed && (
              <span className={styles.sidebarLangLabel}>{currentLangLabel}</span>
            )}
          </button>
        </div>

        <div className={styles.sidebarFooter}>
          {!collapsed && <span className={styles.sidebarSectionTitle}>Settings</span>}
          <div className={styles.sidebarSettings}>
            <ThemeToggle compact={collapsed} />
            <HfBoostToggle configDefault={config.useHfBoost} />
            <SpaceStatus spaces={spaces} onRefresh={onRefreshStatus} compact={collapsed} />
          </div>
        </div>

        {langSheetOpen && (
          <div className={styles.langSheet} role="dialog" aria-modal="true">
            <div
              className={styles.langSheetBackdrop}
              onClick={() => setLangSheetOpen(false)}
              aria-hidden="true"
            />
            <div className={styles.langSheetContent}>
              <div className={styles.langSheetHeader}>
                <h3>Choose a language</h3>
                <button
                  type="button"
                  onClick={() => setLangSheetOpen(false)}
                  className={styles.langSheetClose}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <LanguagePicker
                value={language}
                onChange={(next) => {
                  onChangeLanguage(next);
                  setLangSheetOpen(false);
                }}
                config={config}
              />
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function BrandMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="vs-brand" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7c5cff" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <path
        d="M16 4a4 4 0 0 0-4 4v8a4 4 0 0 0 8 0V8a4 4 0 0 0-4-4z"
        fill="url(#vs-brand)"
      />
      <path
        d="M8 14v2a8 8 0 0 0 16 0v-2"
        fill="none"
        stroke="url(#vs-brand)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M16 24v4M12 28h8" fill="none" stroke="url(#vs-brand)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}
