/**
 * Voice Studio — full-screen route layout.
 *
 * Lives OUTSIDE the (site) route group so the global Header / Footer /
 * MobileDock chrome is not rendered. The Voice Studio owns the entire
 * viewport so its sidebar + hero stage + floating player can use the full
 * height without competing with the marketing shell.
 */

import './voice-studio-host.css';

export default function VoiceStudioLayout({ children }: { children: React.ReactNode }) {
  return <div className="vs-shell-host">{children}</div>;
}
