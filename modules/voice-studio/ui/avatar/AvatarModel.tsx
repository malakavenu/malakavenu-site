'use client';

/**
 * 3D Avatar Model — loads a Ready Player Me GLB and drives:
 *   - Viseme morphs (real-time mouth shapes from `useLipsync`).
 *   - Idle blink loop (3-6 s with quick close/open + occasional double-blink).
 *   - Slow chest breath via subtle Y-scale + position animation.
 *   - Subtle head sway toward the camera when idle.
 *   - Faint smile baseline when silent.
 *
 * Crashes if the GLB fails to load are caught by the parent `<Suspense>` /
 * error boundary; the SpeakingAvatar component swaps in the AnimatedFace SVG portrait.
 */

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Box3 } from 'three';
import type { Group, SkinnedMesh } from 'three';
import { OCULUS_VISEMES, type LipsyncState } from './useLipsync';

interface AvatarModelProps {
  glbUrl: string;
  getState: () => LipsyncState;
}

interface BlinkPlan {
  nextBlinkAt: number;
  blinkPhase: 'idle' | 'closing' | 'opening';
  blinkStart: number;
  doubleBlink: boolean;
}

const BLINK_CLOSE_MS = 80;
const BLINK_OPEN_MS = 120;

function makeBlinkPlan(now: number): BlinkPlan {
  return {
    nextBlinkAt: now + 3000 + Math.random() * 3000,
    blinkPhase: 'idle',
    blinkStart: 0,
    doubleBlink: Math.random() < 0.2,
  };
}

/**
 * Auto-framing — computes scale + Y translation so the avatar's HEAD fills
 * the camera viewport regardless of GLB origin (RPM half-body, TalkingHead
 * full-body, Avaturn, AvatarSDK …).
 *
 * Strategy:
 *
 *   1. Find the head mesh by name. Every rig we support uses one of a small
 *      set of names: `Wolf3D_Head`, `Wolf3D_Hair`, `AvatarHead`, `Avatar_Head`,
 *      `Head`. The head mesh's bbox gives us the authoritative head bounds.
 *
 *   2. Fall back to "the topmost mesh with morph targets" — that's always
 *      the head on a rig that supports lipsync.
 *
 *   3. Fall back to the scene's overall bbox top.
 *
 *   4. Scale so the head fills `TARGET_HEAD_HEIGHT_WORLD` world units (so the
 *      face is consistent in size across avatars).
 *
 *   5. Translate so the head crown lands at `TARGET_HEAD_TOP` world units.
 *
 * This approach is robust against weird body bboxes (AvatarSDK ships with
 * mesh elements way outside the visible body) because it ignores the body
 * dimensions entirely — only the HEAD bbox matters for framing.
 */
interface FitResult {
  scale: number;
  offsetY: number;
}

const TARGET_HEAD_TOP = 0.40;          // World-space Y of head crown post-fit.
const TARGET_HEAD_HEIGHT_WORLD = 0.62; // World height the head should occupy.

// Mesh-name patterns that identify the head/hair on the rigs we ship.
// Ordered by preference — first match wins.
const HEAD_MESH_HINTS = [
  /^Wolf3D_Head$/i,
  /^AvatarHead$/i,
  /^Avatar_Head$/i,
  /^Wolf3D_Hair$/i,
  /^AvatarHair$/i,
  /^Head$/i,
  /head/i,
];

function findHeadBox(scene: Group): Box3 | null {
  // Pass 1 — exact-name match on the priority list.
  for (const pattern of HEAD_MESH_HINTS) {
    let found: Box3 | null = null;
    scene.traverse((child) => {
      if (found) return;
      const m = child as { isSkinnedMesh?: boolean; isMesh?: boolean; visible?: boolean; name?: string };
      if (!(m.isSkinnedMesh || m.isMesh) || m.visible === false) return;
      if (!m.name) return;
      if (!pattern.test(m.name)) return;
      const bb = new Box3().setFromObject(child);
      if (isFinite(bb.min.y) && isFinite(bb.max.y)) found = bb;
    });
    if (found) return found;
  }

  // Pass 2 — the topmost mesh whose dictionary has a viseme entry (only the
  // head mesh has visemes; sticking to morph-bearing meshes excludes outfits
  // and accessories that may sit above the head in the bbox).
  let visemeHead: Box3 | null = null;
  let visemeTop = -Infinity;
  scene.traverse((child) => {
    const m = child as {
      isSkinnedMesh?: boolean;
      visible?: boolean;
      morphTargetDictionary?: Record<string, number>;
    };
    if (!m.isSkinnedMesh || m.visible === false) return;
    if (!m.morphTargetDictionary) return;
    if (!('viseme_sil' in m.morphTargetDictionary) && !('jawOpen' in m.morphTargetDictionary)) return;
    const bb = new Box3().setFromObject(child);
    if (!isFinite(bb.max.y)) return;
    if (bb.max.y > visemeTop) {
      visemeTop = bb.max.y;
      visemeHead = bb;
    }
  });
  return visemeHead;
}

function computeFit(scene: Group): FitResult {
  scene.updateMatrixWorld(true);

  const headBox = findHeadBox(scene);
  if (!headBox) {
    return { scale: 1, offsetY: 0 };
  }

  const headHeight = headBox.max.y - headBox.min.y;
  const crownLocal = headBox.max.y;

  if (headHeight <= 0.0001) {
    return { scale: 1, offsetY: 0 };
  }

  // Scale so the HEAD (not the whole body) is `TARGET_HEAD_HEIGHT_WORLD`
  // tall in world units. This is the key fix vs. the old "scale the whole
  // body" approach: it's robust against weird body bboxes (AvatarSDK has
  // mesh elements far outside the visible body) because we only depend on
  // the head's own dimensions for framing.
  const scale = TARGET_HEAD_HEIGHT_WORLD / headHeight;
  const crownAfterScale = crownLocal * scale;
  const offsetY = TARGET_HEAD_TOP - crownAfterScale;

  return { scale, offsetY };
}

export function AvatarModel({ glbUrl, getState }: AvatarModelProps) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(glbUrl);
  // Ready Player Me / ARKit rigs split morph targets across multiple meshes
  // (typically Wolf3D_Head + Wolf3D_Teeth + EyeLeft + EyeRight). Animating
  // only one of them means the face barely opens — we have to drive every
  // mesh that owns the relevant morph.
  const morphMeshesRef = useRef<SkinnedMesh[]>([]);
  const blinkRef = useRef<BlinkPlan>(makeBlinkPlan(0));
  const breathPhaseRef = useRef(0);
  const headSwayPhaseRef = useRef(0);
  const baseYRef = useRef(0);

  // Derive fit (scale + Y offset) and morph-mesh list directly from the
  // suspended GLB scene. Using `useMemo` instead of `useState` + `useEffect`
  // keeps the values in sync with the loaded scene without an extra render
  // pass, and avoids React's "set state inside effect" lint warning.
  const fit = useMemo<FitResult>(
    () => computeFit(scene as Group),
    [scene]
  );
  const morphMeshes = useMemo<SkinnedMesh[]>(() => {
    if (!scene) return [];
    const list: SkinnedMesh[] = [];
    scene.traverse((child) => {
      const mesh = child as SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;
      if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
      const dict = mesh.morphTargetDictionary;
      // Keep any mesh that owns one of the morph categories we drive: visemes,
      // jaw, blinks, or smile. The eye meshes own blink + visemes too (because
      // RPM duplicates the full ARKit set on each), so they must be animated
      // together for the face to read as one.
      if (
        'viseme_sil' in dict ||
        'jawOpen' in dict ||
        'eyeBlinkLeft' in dict ||
        'mouthSmileLeft' in dict
      ) {
        list.push(mesh);
      }
    });
    return list;
  }, [scene]);

  // Sync derived state into refs that `useFrame` reads on every tick.
  useEffect(() => {
    morphMeshesRef.current = morphMeshes;
    blinkRef.current = makeBlinkPlan(performance.now());
  }, [morphMeshes]);

  useEffect(() => {
    baseYRef.current = fit.offsetY;
  }, [fit.offsetY]);

  useFrame((_, delta) => {
    const meshes = morphMeshesRef.current;
    if (meshes.length === 0) return;

    const state = getState();
    const now = performance.now();

    // ── Per-mesh blink scheduling (single plan, applied to all meshes) ─────
    const plan = blinkRef.current;
    if (plan.blinkPhase === 'idle' && now >= plan.nextBlinkAt) {
      plan.blinkPhase = 'closing';
      plan.blinkStart = now;
    }
    let blinkWeight = 0;
    if (plan.blinkPhase === 'closing') {
      const t = (now - plan.blinkStart) / BLINK_CLOSE_MS;
      blinkWeight = Math.min(1, t);
      if (t >= 1) {
        plan.blinkPhase = 'opening';
        plan.blinkStart = now;
      }
    } else if (plan.blinkPhase === 'opening') {
      const t = (now - plan.blinkStart) / BLINK_OPEN_MS;
      blinkWeight = Math.max(0, 1 - t);
      if (t >= 1) {
        plan.blinkPhase = 'idle';
        if (plan.doubleBlink) {
          plan.doubleBlink = false;
          plan.nextBlinkAt = now + 150;
        } else {
          plan.nextBlinkAt = now + 3000 + Math.random() * 3000;
          plan.doubleBlink = Math.random() < 0.2;
        }
      }
    }

    const smileTarget = state.idle ? 0.18 : 0.05;
    // ARKit jawOpen is the most reliable "open mouth" morph across rigs; we
    // also amplify it with state.volume so even rigs without visemes look alive.
    const jawTarget = Math.min(1, state.volume * 1.4);

    for (let m = 0; m < meshes.length; m++) {
      const mesh = meshes[m];
      const dict = mesh.morphTargetDictionary;
      const influences = mesh.morphTargetInfluences;
      if (!dict || !influences) continue;

      // ── Visemes — smooth lerp to target weights from useLipsync ──────────
      for (let i = 0; i < OCULUS_VISEMES.length; i++) {
        const name = OCULUS_VISEMES[i];
        const idx = dict[name];
        if (idx !== undefined) {
          const target = state.visemes[i] ?? 0;
          influences[idx] += (target - influences[idx]) * 0.5;
        }
      }

      // ── Generic mouth-open driver (jawOpen on ARKit, mouthOpen on legacy) ─
      const jawIdx = dict['jawOpen'] ?? dict['mouthOpen'];
      if (jawIdx !== undefined) {
        influences[jawIdx] += (jawTarget - influences[jawIdx]) * 0.4;
      }

      // ── Blink — drive both eyes consistently across all meshes ───────────
      const blinkL = dict['eyeBlinkLeft'];
      const blinkR = dict['eyeBlinkRight'];
      if (blinkL !== undefined) influences[blinkL] = blinkWeight;
      if (blinkR !== undefined) influences[blinkR] = blinkWeight;

      // ── Faint baseline smile when idle ───────────────────────────────────
      const smileL = dict['mouthSmileLeft'] ?? dict['mouthSmile'];
      const smileR = dict['mouthSmileRight'];
      if (smileL !== undefined) influences[smileL] += (smileTarget - influences[smileL]) * 0.06;
      if (smileR !== undefined) influences[smileR] += (smileTarget - influences[smileR]) * 0.06;
    }

    // ── Slow chest breath + micro head sway ────────────────────────────────
    if (groupRef.current) {
      breathPhaseRef.current += delta * 1.4;
      headSwayPhaseRef.current += delta * 0.7;

      const breath = Math.sin(breathPhaseRef.current) * 0.012;
      const sway = Math.sin(headSwayPhaseRef.current) * 0.04;

      groupRef.current.position.y = baseYRef.current + breath;
      groupRef.current.rotation.y = sway * (state.idle ? 1 : 0.4);
      // Slight z-tilt when speaking to feel engaged.
      groupRef.current.rotation.z = state.volume * 0.02;
    }
  });

  return (
    <group ref={groupRef} position={[0, fit.offsetY, 0]} scale={fit.scale}>
      <primitive object={scene} />
    </group>
  );
}
