'use client';

import styles from '../../styles/meme-studio.module.css';

/** Small satire/parody disclaimer shown in the studio footer. */
export function ConsentNote() {
  return (
    <p className={styles.consentNote}>
      Satire / parody tool. Memes are grounded in the source transcript — avoid
      fabricated claims, communal angles, or personal attacks. You are
      responsible for what you publish.
    </p>
  );
}
