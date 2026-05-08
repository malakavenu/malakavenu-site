'use client';

export function Spinner({ size = 36, label = 'Loading' }: { size?: number; label?: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '3px solid rgba(255,255,255,0.12)',
        borderTopColor: 'var(--brand-1)',
        margin: '0 auto',
        animation: 'pg-spin 0.9s linear infinite',
      }}
    >
      <style>{`@keyframes pg-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
