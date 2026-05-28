/**
 * Client-side console filter — suppresses the small set of *cosmetic* warnings
 * that come from third-party libraries we depend on but cannot upgrade
 * out-of-band without a breaking change.
 *
 * We only silence exact, known strings. Any message that doesn't match
 * passes through untouched.
 */

const SUPPRESSED_FRAGMENTS: string[] = [
  // three.js r180+ deprecation warning emitted on first Clock instantiation.
  // Used internally by @react-three/fiber's render loop — nothing we can fix
  // from app code until R3F migrates to THREE.Timer.
  'THREE.Clock: This module has been deprecated',
];

let installed = false;

export function installVoiceStudioConsoleFilter(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const originalWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    const first = args[0];
    if (typeof first === 'string' && SUPPRESSED_FRAGMENTS.some((f) => first.includes(f))) {
      return;
    }
    originalWarn(...args);
  };
}
