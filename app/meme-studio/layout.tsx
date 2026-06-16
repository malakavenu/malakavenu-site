/**
 * Meme Studio — full-screen route layout.
 *
 * Lives OUTSIDE the (site) route group so the global Header / Footer /
 * MobileDock chrome is not rendered. Also loads the meme fonts (Anton for
 * impact text, Noto Sans Telugu for తెలుగు captions) so the canvas compositor
 * can render them.
 */

import '@fontsource/anton';
import '@fontsource/noto-sans-telugu/400.css';
import '@fontsource/noto-sans-telugu/700.css';
import './meme-studio-host.css';

export default function MemeStudioLayout({ children }: { children: React.ReactNode }) {
  return <div className="ms-shell-host">{children}</div>;
}
