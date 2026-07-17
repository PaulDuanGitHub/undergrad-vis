import * as THREE from 'three';

export const INTRO_CAMERA_POSITION = new THREE.Vector3(0.5, 0.6, 2.5);

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

export const FOCUS_TARGET = new THREE.Vector3(-0.0024912, 0.06838, -0.0225949);
export const FOCUS_CAMERA_POSITION = new THREE.Vector3(
  -0.0049475,
  0.71495,
  0.386744
);

export const INTRO_DURATION = 1;
export const ANIMATION_DURATION = 0.8;
export const PARALLAX_AMOUNT = 0.015;

export const easeInOut = (t: number) => 0.5 * (1 - Math.cos(Math.PI * t));
export const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
