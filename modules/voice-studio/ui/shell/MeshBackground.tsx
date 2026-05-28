'use client';

/**
 * Animated mesh-gradient background — purely CSS, no WebGL.
 *
 * Four radial-gradient blobs orbit slowly behind the studio. A faint grain
 * overlay adds depth. Respects `prefers-reduced-motion`. Both light and dark
 * themes are handled via CSS variables in `voice-studio.module.css`.
 */

import styles from '../../styles/voice-studio.module.css';

export function MeshBackground() {
  return (
    <div className={styles.meshBg} aria-hidden="true">
      <div className={`${styles.meshBlob} ${styles.meshBlob1}`} />
      <div className={`${styles.meshBlob} ${styles.meshBlob2}`} />
      <div className={`${styles.meshBlob} ${styles.meshBlob3}`} />
      <div className={`${styles.meshBlob} ${styles.meshBlob4}`} />
      <div className={styles.meshGrain} />
      <div className={styles.meshVignette} />
    </div>
  );
}
