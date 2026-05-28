'use client';

/**
 * Consent gate modal — shown before first voice clone operation.
 * Informs users about ethical use and AudioSeal watermarking.
 */

import { useState } from 'react';
import styles from '../../styles/voice-studio.module.css';

const CONSENT_KEY = 'voice-studio-clone-consent';

interface ConsentGateProps {
  onConsent: () => void;
  onDecline: () => void;
}

export function ConsentGate({ onConsent, onDecline }: ConsentGateProps) {
  return (
    <div className={styles.consentOverlay} role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <div className={styles.consentModal}>
        <h2 id="consent-title" className={styles.consentTitle}>
          Voice Cloning — Ethical Use Notice
        </h2>

        <div className={styles.consentBody}>
          <p>
            Voice cloning creates synthetic speech that sounds like a specific person.
            Please use this responsibly:
          </p>

          <ul className={styles.consentList}>
            <li>
              <strong>Only clone voices you have permission to use</strong> — your own voice,
              or voices where you have explicit consent from the speaker.
            </li>
            <li>
              <strong>Do not impersonate others</strong> — creating fake audio of real people
              without consent is unethical and may be illegal.
            </li>
            <li>
              <strong>All cloned audio is watermarked</strong> — an inaudible AudioSeal watermark
              is embedded in every output for traceability.
            </li>
          </ul>

          <p className={styles.consentNote}>
            By proceeding, you confirm you have the right to clone this voice and will use
            the output responsibly.
          </p>
        </div>

        <div className={styles.consentActions}>
          <button
            type="button"
            className={styles.consentDeclineBtn}
            onClick={onDecline}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.consentAcceptBtn}
            onClick={onConsent}
          >
            I understand — proceed
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage consent state.
 */
function readInitialConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(CONSENT_KEY) === 'true';
  } catch {
    return false;
  }
}

export function useCloneConsent() {
  const [hasConsented, setHasConsented] = useState<boolean>(readInitialConsent);
  const [showGate, setShowGate] = useState(false);

  const requestConsent = () => {
    if (hasConsented) return true;
    setShowGate(true);
    return false;
  };

  const grantConsent = () => {
    localStorage.setItem(CONSENT_KEY, 'true');
    setHasConsented(true);
    setShowGate(false);
  };

  const declineConsent = () => {
    setShowGate(false);
  };

  return { hasConsented, showGate, requestConsent, grantConsent, declineConsent };
}
