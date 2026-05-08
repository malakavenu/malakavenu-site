import type { CSSProperties } from 'react';

/**
 * Shared inline styles for the playground tabs. Centralized so Generate,
 * Chat, and any future tabs render with one consistent look.
 */

export const textareaStyle: CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  fontFamily: 'var(--font-body)',
  // 16px+ avoids iOS Safari auto-zoom on input focus
  fontSize: 16,
  lineHeight: 1.6,
  resize: 'vertical',
  outline: 'none',
};

export const chipStyle: CSSProperties = {
  padding: '8px 12px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 999,
  color: 'var(--text-soft)',
  fontSize: 12,
  cursor: 'pointer',
  maxWidth: 320,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const selectStyle: CSSProperties = {
  padding: '8px 12px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
  cursor: 'pointer',
};

export const surfaceStyle: CSSProperties = {
  minHeight: 320,
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--border)',
  background:
    'linear-gradient(135deg, rgba(124,92,255,0.06), rgba(34,211,238,0.04))',
  padding: 24,
  overflow: 'hidden',
};

export const subtleNote: CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: 12,
  lineHeight: 1.6,
};
