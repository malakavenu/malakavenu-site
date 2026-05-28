'use client';

/**
 * R3F Canvas wrapper for the speaking avatar.
 *
 * Modes:
 *  - `stage`     — large hero stage rendering: studio-grade lighting, contact
 *                  shadow, sparkles, slightly higher dpr.
 *  - `widget`    — small floating-corner rendering: minimal lighting, dpr capped.
 *  - `expanded`  — full-screen theatrical: highest dpr, studio env + sparkles.
 *
 * The component is dynamic-imported to avoid Three.js touching SSR.
 */

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  Environment,
  OrbitControls,
  ContactShadows,
  Sparkles,
} from '@react-three/drei';
import { AvatarModel } from './AvatarModel';
import type { LipsyncState } from './useLipsync';

type AvatarMode = 'stage' | 'widget' | 'expanded';

interface AvatarCanvasProps {
  glbUrl: string;
  getState: () => LipsyncState;
  mode?: AvatarMode;
}

const DPR_BY_MODE: Record<AvatarMode, [number, number]> = {
  widget: [1, 1.5],
  stage: [1, 2],
  expanded: [1, 2.5],
};

export function AvatarCanvas({ glbUrl, getState, mode = 'stage' }: AvatarCanvasProps) {
  const showSparkles = mode !== 'widget';
  const showContactShadow = mode !== 'widget';
  const cameraDistance = mode === 'expanded' ? 1.7 : 1.55;

  return (
    <Canvas
      camera={{ position: [0, 0.05, cameraDistance], fov: 32 }}
      dpr={DPR_BY_MODE[mode]}
      style={{ background: 'transparent' }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
    >
      {/* Three-point studio lighting */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[2, 3, 4]} intensity={0.95} color="#fff5e8" />
      <directionalLight position={[-3, 2, -1]} intensity={0.45} color="#b4c6ff" />
      <pointLight position={[0, -1, 2]} intensity={0.4} color="#7c5cff" />

      <Suspense fallback={null}>
        {/* Keying on the GLB URL forces a fresh AvatarModel mount when the
            user switches presets. Without this, the previous avatar's fit
            (scale + offsetY) lingers in component state and the new avatar
            renders mis-framed until useEffect catches up — exactly the
            "changing avatars changes position" bug the user reported. */}
        <AvatarModel key={glbUrl} glbUrl={glbUrl} getState={getState} />
        <Environment preset="studio" />
        {showContactShadow && (
          <ContactShadows
            position={[0, -1.45, 0]}
            opacity={0.45}
            scale={3.5}
            blur={2.6}
            far={2}
            color="#0a0c14"
          />
        )}
        {showSparkles && (
          <Sparkles
            count={40}
            scale={[2, 2.4, 0.4]}
            size={1.4}
            speed={0.25}
            opacity={0.6}
            color="#a99cff"
          />
        )}
      </Suspense>

      <OrbitControls
        enableZoom={mode === 'expanded'}
        enablePan={false}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 1.8}
        minDistance={1.2}
        maxDistance={2.4}
        target={[0, 0.05, 0]}
      />
    </Canvas>
  );
}
