'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Catches render-time errors anywhere in the studio tree so a single broken
 * concept/render can't white-screen the whole route. Shows a recovery action.
 */
export class MemeStudioErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Something went wrong.' };
  }

  componentDidCatch(error: Error): void {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[meme-studio] render error', error);
    }
  }

  private reset = (): void => this.setState({ hasError: false, message: '' });

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div
        role="alert"
        style={{
          minHeight: '60vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          textAlign: 'center',
          color: 'rgba(255,255,255,0.85)',
        }}
      >
        <div style={{ maxWidth: 420, display: 'grid', gap: 16, justifyItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Something went wrong</h2>
          <p style={{ margin: 0, opacity: 0.7, fontSize: 14 }}>{this.state.message}</p>
          <button
            type="button"
            onClick={this.reset}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.08)',
              color: 'inherit',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
