'use client';

/**
 * VoiceStudio — main shell.
 *
 * Layout (desktop):
 *  ┌────────────┬─────────────────────────────────────────────┐
 *  │            │                  HeroStage                  │
 *  │   Sidebar  ├─────────────────────────────────────────────┤
 *  │            │                                             │
 *  │   nav      │              Active panel (cards)           │
 *  │   lang     │                                             │
 *  │   theme    │                                             │
 *  │   boost    │                                             │
 *  │            │                                             │
 *  └────────────┴─────────────────────────────────────────────┘
 *  ┌──────────────────────────────────────────────────────────┐
 *  │                    FloatingPlayer (pinned)               │
 *  └──────────────────────────────────────────────────────────┘
 *
 * Mobile collapses the sidebar to a bottom-icon nav and stacks hero / panel.
 */

import { useState, useEffect } from 'react';
import type {
  Engine,
  LanguageCode,
  PanelId,
  VoiceStudioConfig,
} from '../types';
import { LANGUAGES } from '../config';
import { installVoiceStudioConsoleFilter } from '../client/console-filter';
import { AudioContextProvider } from './AudioContext';
import { NewsReaderPanel } from './panels/NewsReaderPanel';
import { VoiceClonePanel } from './panels/VoiceClonePanel';
import { VoiceConvertPanel } from './panels/VoiceConvertPanel';
import { TranslateNarratePanel } from './panels/TranslateNarratePanel';
import { Sidebar } from './shell/Sidebar';
import { HeroStage } from './shell/HeroStage';
import { FloatingPlayer } from './shell/FloatingPlayer';
import { MeshBackground } from './shell/MeshBackground';
import { EngineToggle } from './EngineToggle';
import { useSpaceStatus } from './shared/SpaceStatus';
import styles from '../styles/voice-studio.module.css';

function warmUpSpace(space: string): void {
  const baseUrl = `https://${space.replace('/', '-').toLowerCase()}.hf.space`;
  fetch(baseUrl, { method: 'HEAD', mode: 'no-cors' }).catch(() => {});
}

interface VoiceStudioProps {
  config: VoiceStudioConfig;
}

if (typeof window !== 'undefined') {
  installVoiceStudioConsoleFilter();
}

export function VoiceStudio({ config }: VoiceStudioProps) {
  return (
    <AudioContextProvider defaultAvatarId={config.defaultAvatarId}>
      <div className={styles.vsRoot} data-vs-root data-theme="dark">
        <MeshBackground />
        <VoiceStudioInner config={config} />
      </div>
    </AudioContextProvider>
  );
}

function VoiceStudioInner({ config }: VoiceStudioProps) {
  const [language, setLanguage] = useState<LanguageCode>(config.defaultLanguage);
  const [engine, setEngine] = useState<Engine>('openvoice');
  // The user's *requested* panel — may not always be available for every
  // language. We always derive the *effective* active panel from this + the
  // current panels list (no setState in effect needed).
  const [requestedPanel, setRequestedPanel] = useState<PanelId>('news-reader');

  const langEntry = LANGUAGES[language];
  const { spaces, refresh: refreshStatus } = useSpaceStatus();

  useEffect(() => {
    if (langEntry?.newsReader.kind === 'hf-space') {
      warmUpSpace(langEntry.newsReader.space);
    }
  }, [language, langEntry]);

  const panels = getPanelsForLanguage(language);
  const activePanel: PanelId =
    panels.find((p) => p.id === requestedPanel)?.id ?? panels[0]?.id ?? 'news-reader';

  const showEngineToggle =
    activePanel === 'voice-clone' &&
    config.enableExperimentalEngines &&
    hasExperimentalClone(language);

  return (
    <div className={styles.shell}>
      <Sidebar
        language={language}
        onChangeLanguage={setLanguage}
        activePanel={activePanel}
        onChangePanel={setRequestedPanel}
        panels={panels}
        config={config}
        spaces={spaces}
        onRefreshStatus={refreshStatus}
      />

      <main className={styles.main}>
        <HeroStage activePanel={activePanel} language={language} />

        {showEngineToggle && (
          <EngineToggle value={engine} onChange={setEngine} language={language} />
        )}

        <div className={styles.panelContainer}>
          {activePanel === 'news-reader' && (
            <NewsReaderPanel language={language} config={config} />
          )}
          {activePanel === 'voice-clone' && (
            <VoiceClonePanel language={language} engine={engine} config={config} />
          )}
          {activePanel === 'voice-convert' && (
            <VoiceConvertPanel config={config} />
          )}
          {activePanel === 'translate-speak' && (
            <TranslateNarratePanel language={language} config={config} />
          )}
        </div>
      </main>

      <FloatingPlayer />
    </div>
  );
}

interface PanelDef {
  id: PanelId;
  label: string;
}

function getPanelsForLanguage(language: LanguageCode): PanelDef[] {
  const entry = LANGUAGES[language];
  if (!entry) return [];

  const panels: PanelDef[] = [];

  if (entry.newsReader.kind !== 'disabled') {
    panels.push({ id: 'news-reader', label: 'News Reader' });
  }

  const clone = entry.clone;
  const cloneAvailable =
    !('kind' in clone && clone.kind === 'disabled') &&
    ('default' in clone && clone.default && !('kind' in clone.default && clone.default.kind === 'disabled'));
  if (cloneAvailable) {
    panels.push({ id: 'voice-clone', label: 'Voice Clone' });
  }

  panels.push({ id: 'voice-convert', label: 'Voice Convert' });

  if (entry.group === 'indic' || entry.group === 'featured') {
    panels.push({ id: 'translate-speak', label: 'Translate & Speak' });
  }

  return panels;
}

function hasExperimentalClone(language: LanguageCode): boolean {
  const entry = LANGUAGES[language];
  if (!entry) return false;
  const clone = entry.clone;
  if ('kind' in clone) return false;
  return 'experimental' in clone && !!clone.experimental;
}
