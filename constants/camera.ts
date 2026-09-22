import * as THREE from 'three';

// 1. Hugging the blank part of the desk
export const INTRO_CAMERA_POSITION = new THREE.Vector3(-0.13234, 0.2026, 0.06294);
export const INTRO_TARGET = new THREE.Vector3(-0.13234, 0.06838, 0.06294);

// Point 1: Y-axis lift to pull away from the close-up.
export const INTRO_LIFT_CAMERA_POS = new THREE.Vector3(-0.03207, 0.50926, 0.69346);
export const INTRO_LIFT_TARGET = new THREE.Vector3(-0.09379, 0.06838, 0.03440);

// lg (≥1024px)
export const INITIAL_CAMERA_POSITION = new THREE.Vector3(
  0.06678,
  0.239,
  1.00088
);
export const INITIAL_TARGET = new THREE.Vector3(-0.01668, 0.06838, -0.02268);

// md (≥768px, <1024px)
export const INITIAL_CAMERA_POSITION_MD = new THREE.Vector3(
  -0.088781,
  0.716221,
  0.662783
);
export const INITIAL_TARGET_MD = new THREE.Vector3(
  -0.040929,
  0.051554,
  -0.082823
);

// sm (<768px)
export const INITIAL_CAMERA_POSITION_SM = new THREE.Vector3(
  -0.140185,
  0.793578,
  0.809086
);
export const INITIAL_TARGET_SM = new THREE.Vector3(
  -0.092333,
  0.128911,
  0.063481
);

/** Return the responsive initial camera position + target for the given viewport width */
export function getInitialCamera(width: number): {
  position: THREE.Vector3;
  target: THREE.Vector3;
} {
  if (width >= 1024) {
    return { position: INITIAL_CAMERA_POSITION, target: INITIAL_TARGET };
  }
  if (width >= 768) {
    return { position: INITIAL_CAMERA_POSITION_MD, target: INITIAL_TARGET_MD };
  }
  return { position: INITIAL_CAMERA_POSITION_SM, target: INITIAL_TARGET_SM };
}

export type CameraPose = {
  position: THREE.Vector3;
  target: THREE.Vector3;
};

export type IntroCurves = {
  position: THREE.CatmullRomCurve3;
  target: THREE.CatmullRomCurve3;
};

/** Built once per breakpoint so the per-frame `getPointAt` never allocates. */
const introCurveCache = new Map<'lg' | 'md' | 'sm', IntroCurves>();

/**
 * Camera splines for the intro fly-through: INTRO → LIFT → responsive rest pose.
 * Centripetal Catmull-Rom (the `THREE.CatmullRomCurve3` default) is the variant
 * that does not overshoot, so the lift cannot swing past the resting pose.
 */
export function getIntroCurves(width: number): IntroCurves {
  const key = width >= 1024 ? 'lg' : width >= 768 ? 'md' : 'sm';
  const cached = introCurveCache.get(key);
  if (cached) return cached;

  const rest = getInitialCamera(width);
  const curves: IntroCurves = {
    position: new THREE.CatmullRomCurve3([
      INTRO_CAMERA_POSITION.clone(),
      INTRO_LIFT_CAMERA_POS.clone(),
      rest.position.clone(),
    ]),
    target: new THREE.CatmullRomCurve3([
      INTRO_TARGET.clone(),
      INTRO_LIFT_TARGET.clone(),
      rest.target.clone(),
    ]),
  };
  introCurveCache.set(key, curves);
  return curves;
}

export const FOCUS_TARGET = new THREE.Vector3(-0.0024912, 0.06838, -0.0225949);
export const FOCUS_CAMERA_POSITION = new THREE.Vector3(
  -0.0049475,
  0.71495,
  0.386744
);

export const INTRO_DURATION = 2;
export const ANIMATION_DURATION = 0.8;
export const PARALLAX_AMOUNT = 0.015;

export const easeInOut = (t: number) => 0.5 * (1 - Math.cos(Math.PI * t));
export const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;