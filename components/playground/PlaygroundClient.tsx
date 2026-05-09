'use client';

import { useCallback, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { GenerateTab } from './GenerateTab';
import { ChatTab } from './ChatTab';
import { EditTab } from './EditTab';
import { track } from '@/lib/track';

type Mode = 'generate' | 'chat' | 'edit';

type TabDef = {
  id: Mode;
  label: string;
  hint: string;
  icon: ReactNode;
};

const TABS: TabDef[] = [
  {
    id: 'generate',
    label: 'Generate',
    hint: 'Type a prompt → get an image',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
        <circle cx="12" cy="12" r="3.5" />
      </svg>
    ),
  },
  {
    id: 'chat',
    label: 'Ask Malaka',
    hint: 'Chat grounded in this site',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'edit',
    label: 'Edit photo',
    hint: 'Filters & AI restyle',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="9" cy="9" r="1.6" />
        <path d="m4 17 5-5 4 4 3-3 4 4" />
      </svg>
    ),
  },
];

const TAB_ID = (id: Mode) => `playground-tab-${id}`;
const PANEL_ID = (id: Mode) => `playground-panel-${id}`;

export function PlaygroundClient() {
  const [mode, setMode] = useState<Mode>('generate');
  // Cross-tab pipe: GenerateTab can hand a generated image off to EditTab.
  // We hold the file at this level so the EditTab can consume it as a prop
  // when it mounts (it only mounts when mode === 'edit').
  const [pendingEditFile, setPendingEditFile] = useState<File | null>(null);

  const handleChange = (next: Mode) => {
    if (next !== mode) {
      track('playground_tab_switch', { from: mode, to: next });
    }
    setMode(next);
  };

  const handleUseInEdit = useCallback(
    (file: File) => {
      setPendingEditFile(file);
      if (mode !== 'edit') {
        track('playground_tab_switch', { from: mode, to: 'edit', via: 'use-as-input' });
      }
      setMode('edit');
    },
    [mode],
  );

  const handleEditConsumed = useCallback(() => {
    setPendingEditFile(null);
  }, []);

  return (
    <div>
      <ModeToggle mode={mode} onChange={handleChange} />

      <div className="pg-card">
        <div
          role="tabpanel"
          id={PANEL_ID('generate')}
          aria-labelledby={TAB_ID('generate')}
          hidden={mode !== 'generate'}
        >
          {mode === 'generate' && <GenerateTab onUseInEdit={handleUseInEdit} />}
        </div>
        <div
          role="tabpanel"
          id={PANEL_ID('chat')}
          aria-labelledby={TAB_ID('chat')}
          hidden={mode !== 'chat'}
        >
          {mode === 'chat' && <ChatTab />}
        </div>
        <div
          role="tabpanel"
          id={PANEL_ID('edit')}
          aria-labelledby={TAB_ID('edit')}
          hidden={mode !== 'edit'}
        >
          {mode === 'edit' && (
            <EditTab initialFile={pendingEditFile} onInitialConsumed={handleEditConsumed} />
          )}
        </div>
      </div>
    </div>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = TABS.length - 1;
    let nextIndex: number | null = null;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = index === last ? 0 : index + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = index === 0 ? last : index - 1;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = last;

    if (nextIndex === null) return;

    e.preventDefault();
    const nextTab = TABS[nextIndex];
    onChange(nextTab.id);
    requestAnimationFrame(() => {
      tabRefs.current[nextIndex!]?.focus();
    });
  };

  return (
    <div role="tablist" aria-label="Playground mode" aria-orientation="horizontal" className="pg-tabs">
      {TABS.map((tab, index) => {
        const active = mode === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={TAB_ID(tab.id)}
            aria-selected={active}
            aria-controls={PANEL_ID(tab.id)}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onTabKeyDown(e, index)}
            className="pg-tab"
          >
            <span className="pg-tab-icon" aria-hidden="true">
              {tab.icon}
            </span>
            <span className="pg-tab-text">
              <span className="pg-tab-label">{tab.label}</span>
              <span className="pg-tab-hint">{tab.hint}</span>
            </span>
            <svg
              className="pg-tab-arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
