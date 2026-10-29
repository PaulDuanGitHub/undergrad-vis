"use client";

import React, { Suspense, useCallback, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import ThreeScene from "@/components/landing/ThreeScene";
import {
  FOCUS_CAMERA_POSITION,
  FOCUS_TARGET,
  INITIAL_CAMERA_POSITION,
  INITIAL_CAMERA_POSITION_MD,
  INITIAL_CAMERA_POSITION_SM,
  INITIAL_TARGET,
  INITIAL_TARGET_MD,
  INITIAL_TARGET_SM,
  INTRO_CAMERA_POSITION,
  INTRO_LIFT_CAMERA_POS,
  INTRO_LIFT_TARGET,
  INTRO_TARGET,
  getInitialCamera,
} from "@/constants/camera";

/**
 * Debug harness for the landing-page camera.
 *
 * - Same scene + renderer settings as `Landing`, but with NO detail interaction:
 *   there is no click / wheel / swipe handler and `isDetailOpen` is pinned to
 *   `false`, so the desk animation never plays. The only camera authority is
 *   `OrbitControls` (the hand-rolled `CameraController` is intentionally not
 *   mounted here, otherwise the two would fight every frame).
 * - A live readout shows the camera position / look-at target / distance, and
 *   the preset buttons snap the camera to the values in `constants/camera.ts`
 *   so they can be compared and re-copied straight back into that file.
 *
 * HUD updates are written imperatively via rAF (no React state per frame), so
 * orbiting never re-renders the Canvas.
 */

type Readout = {
  position: THREE.Vector3;
  target: THREE.Vector3;
  distance: number;
  width: number;
};

/** Imperative "move the camera" command exposed by the in-canvas rig. */
type SnapFn = (position: THREE.Vector3, target: THREE.Vector3) => void;

type ControlsLike = { target: THREE.Vector3; update: () => void };

const FIXED = (n: number) => n.toFixed(5);

const responsivePresetLabel = (width: number) =>
  width >= 1024 ? "lg" : width >= 768 ? "md" : "sm";

const PRESETS: {
  label: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
}[] = [
  // Control points of the intro fly-through spline (`getIntroCurves`), in order.
  { label: "intro", position: INTRO_CAMERA_POSITION, target: INTRO_TARGET },
  { label: "lift", position: INTRO_LIFT_CAMERA_POS, target: INTRO_LIFT_TARGET },
  { label: "lg", position: INITIAL_CAMERA_POSITION, target: INITIAL_TARGET },
  { label: "md", position: INITIAL_CAMERA_POSITION_MD, target: INITIAL_TARGET_MD },
  { label: "sm", position: INITIAL_CAMERA_POSITION_SM, target: INITIAL_TARGET_SM },
  { label: "focus", position: FOCUS_CAMERA_POSITION, target: FOCUS_TARGET },
];

const NOOP = () => {};

/** Scratch vector reused for the pre-controls target fallback. */
const _direction = new THREE.Vector3();

/* -------------------------------------------------------------------------- */
/* In-canvas rig: reports the camera, accepts snaps                          */
/* -------------------------------------------------------------------------- */

function CameraRig({
  readoutRef,
  snapRef,
}: {
  readoutRef: React.RefObject<Readout>;
  snapRef: React.RefObject<SnapFn | null>;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;
  const didInit = useRef(false);

  // Start from the same responsive framing the landing page settles on after the intro.
  useEffect(() => {
    if (!controls || didInit.current) return;
    didInit.current = true;
    const init = getInitialCamera(size.width);
    camera.position.copy(init.position);
    controls.target.copy(init.target);
    camera.lookAt(init.target);
    controls.update();
  }, [controls, camera, size.width]);

  useEffect(() => {
    snapRef.current = (position, target) => {
      camera.position.copy(position);
      controls?.target.copy(target);
      camera.lookAt(target);
      controls?.update();
    };
    return () => {
      snapRef.current = null;
    };
  }, [camera, controls, snapRef]);

  useFrame(() => {
    const r = readoutRef.current;
    r.position.copy(camera.position);
    if (controls?.target) {
      r.target.copy(controls.target);
    } else {
      // Controls not mounted yet: approximate the focus point along the view direction.
      camera.getWorldDirection(_direction);
      r.target.copy(camera.position).add(_direction);
    }
    r.distance = r.position.distanceTo(r.target);
    r.width = size.width;
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/* DOM HUD                                                                    */
/* -------------------------------------------------------------------------- */

function CameraHud({
  readoutRef,
  snapRef,
}: {
  readoutRef: React.RefObject<Readout>;
  snapRef: React.RefObject<SnapFn | null>;
}) {
  const viewportRef = useRef<HTMLSpanElement>(null);
  const posXRef = useRef<HTMLSpanElement>(null);
  const posYRef = useRef<HTMLSpanElement>(null);
  const posZRef = useRef<HTMLSpanElement>(null);
  const tgtXRef = useRef<HTMLSpanElement>(null);
  const tgtYRef = useRef<HTMLSpanElement>(null);
  const tgtZRef = useRef<HTMLSpanElement>(null);
  const distRef = useRef<HTMLSpanElement>(null);

  const [copied, setCopied] = React.useState<"position" | "target" | null>(null);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 66) return; // ~15fps is plenty for a readout
      last = t;
      const r = readoutRef.current;
      if (posXRef.current) posXRef.current.textContent = FIXED(r.position.x);
      if (posYRef.current) posYRef.current.textContent = FIXED(r.position.y);
      if (posZRef.current) posZRef.current.textContent = FIXED(r.position.z);
      if (tgtXRef.current) tgtXRef.current.textContent = FIXED(r.target.x);
      if (tgtYRef.current) tgtYRef.current.textContent = FIXED(r.target.y);
      if (tgtZRef.current) tgtZRef.current.textContent = FIXED(r.target.z);
      if (distRef.current) distRef.current.textContent = FIXED(r.distance);
      if (viewportRef.current) {
        const width = Math.round(r.width);
        viewportRef.current.textContent = `${width}px · ${responsivePresetLabel(width)}`;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [readoutRef]);

  const copy = useCallback(
    async (which: "position" | "target") => {
      const r = readoutRef.current;
      const v = which === "position" ? r.position : r.target;
      const text = `new THREE.Vector3(${FIXED(v.x)}, ${FIXED(v.y)}, ${FIXED(v.z)})`;
      try {
        await navigator.clipboard.writeText(text);
        setCopied(which);
        setTimeout(() => setCopied(null), 1200);
      } catch {
        // Clipboard is unavailable (insecure context) — the values are on screen anyway.
      }
    },
    [readoutRef]
  );

  const buttonClass =
    "pointer-events-auto rounded border border-black/10 px-1.5 py-0.5 transition-colors hover:border-brand hover:text-brand";

  return (
    <div className="pointer-events-none absolute inset-0 z-20 p-3 sm:p-4">
      <div className="pointer-events-auto w-64 rounded-lg border border-black/10 bg-surface/90 p-3 font-mono text-[11px] leading-tight text-text-primary shadow-lg backdrop-blur-sm">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold tracking-widest text-brand">CAMERA DEBUG</span>
          <span ref={viewportRef} className="tabular-nums text-text-secondary">
            —
          </span>
        </div>

        <div className="mt-2 border-t border-black/10 pt-2">
          <div className="text-text-secondary">position</div>
          <div className="grid grid-cols-[0.75rem_1fr] gap-x-2 tabular-nums">
            <span className="text-text-secondary">x</span>
            <span ref={posXRef}>—</span>
            <span className="text-text-secondary">y</span>
            <span ref={posYRef}>—</span>
            <span className="text-text-secondary">z</span>
            <span ref={posZRef}>—</span>
          </div>
        </div>

        <div className="mt-2 border-t border-black/10 pt-2">
          <div className="text-text-secondary">target</div>
          <div className="grid grid-cols-[0.75rem_1fr] gap-x-2 tabular-nums">
            <span className="text-text-secondary">x</span>
            <span ref={tgtXRef}>—</span>
            <span className="text-text-secondary">y</span>
            <span ref={tgtYRef}>—</span>
            <span className="text-text-secondary">z</span>
            <span ref={tgtZRef}>—</span>
          </div>
        </div>

        <div className="mt-2 flex justify-between border-t border-black/10 pt-2 tabular-nums">
          <span className="text-text-secondary">distance</span>
          <span ref={distRef}>—</span>
        </div>

        <div className="mt-2 flex gap-1">
          <button type="button" className={buttonClass} onClick={() => copy("position")}>
            {copied === "position" ? "copied!" : "copy pos"}
          </button>
          <button type="button" className={buttonClass} onClick={() => copy("target")}>
            {copied === "target" ? "copied!" : "copy tgt"}
          </button>
        </div>

        <div className="mt-2 border-t border-black/10 pt-2">
          <div className="text-text-secondary">snap to preset</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={buttonClass}
                onClick={() => snapRef.current?.(preset.position, preset.target)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`${buttonClass} mt-1 w-full`}
            onClick={() => {
              const init = getInitialCamera(window.innerWidth);
              snapRef.current?.(init.position, init.target);
            }}
          >
            reset to responsive initial
          </button>
        </div>

        <div className="mt-2 border-t border-black/10 pt-2 text-text-secondary">
          open-detail interaction: OFF
          <br />
          orbit: drag · zoom: wheel · pan: right-drag
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page body                                                                  */
/* -------------------------------------------------------------------------- */

export default function CameraDebug() {
  const readoutRef = useRef<Readout>({
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    distance: 0,
    width: 0,
  });
  const snapRef = useRef<SnapFn | null>(null);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-surface font-serif select-none">
      <Canvas
        shadows
        gl={{
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          alpha: true,
          antialias: true,
        }}
        camera={{ fov: 45, position: INTRO_CAMERA_POSITION.toArray() }}
      >
        <ambientLight intensity={3.5} />
        <Suspense fallback={null}>
          {/* isDetailOpen is pinned to false → the desk animation never plays. */}
          <ThreeScene isDetailOpen={false} onPaperCovered={NOOP} />
        </Suspense>
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={0.05}
          maxDistance={5}
          target={INITIAL_TARGET}
        />
        <CameraRig readoutRef={readoutRef} snapRef={snapRef} />
      </Canvas>

      <CameraHud readoutRef={readoutRef} snapRef={snapRef} />
    </div>
  );
}
