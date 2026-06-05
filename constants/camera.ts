import * as THREE from "three";

export const INTRO_CAMERA_POSITION = new THREE.Vector3(0.5, 0.6, 2.5);
export const INITIAL_CAMERA_POSITION = new THREE.Vector3(0.06678, 0.239, 1.00088);
export const INITIAL_TARGET = new THREE.Vector3(-0.01668, 0.06838, -0.02268);

export const FOCUS_TARGET = new THREE.Vector3(-0.0024912, 0.06838, -0.0225949);
export const FOCUS_CAMERA_POSITION = new THREE.Vector3(-0.0049475, 0.71495, 0.386744);

export const INTRO_DURATION = 1;
export const ANIMATION_DURATION = 0.8;
export const PARALLAX_AMOUNT = 0.015;

export const easeInOut = (t: number) => 0.5 * (1 - Math.cos(Math.PI * t));
export const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);