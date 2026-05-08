'use client';

import { useState } from 'react';
import { GenerateTab } from './GenerateTab';
import { ChatTab } from './ChatTab';
import { EditTab } from './EditTab';
import { track } from '@/lib/track';

type Mode = 'generate' | 'chat' | 'edit';

const TABS: Array<{ id: Mode; label: string }> = [
  { id: 'generate', label: 'Generate' },
  { id: 'chat', label: 'Ask Malaka' },
  { id: 'edit', label: 'Edit your image' },
];

export function PlaygroundClient() {
  const [mode, setMode] = useState<Mode>('generate');

  return (
    <div className="card" style={{ padding: 24, display: 'grid', gap: 24 }}>
      <ModeToggle
        mode={mode}
        onChange={(next) => {
          if (next !== mode) {
            track('playground_tab_switch', { from: mode, to: next });
          }
          setMode(next);
        }}
      />

      {mode === 'generate' && <GenerateTab />}
      {mode === 'chat' && <ChatTab />}
      {mode === 'edit' && <EditTab />}
    </div>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Playground mode"
      style={{
        display: 'inline-flex',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 999,
        padding: 4,
        gap: 4,
        alignSelf: 'start',
        flexWrap: 'wrap',
      }}
    >
      {TABS.map((tab) => {
        const active = mode === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: 999,
              background: active ? 'var(--grad-primary)' : 'transparent',
              color: active ? '#fff' : 'var(--text-soft)',
              fontWeight: active ? 600 : 500,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 200ms var(--ease)',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
