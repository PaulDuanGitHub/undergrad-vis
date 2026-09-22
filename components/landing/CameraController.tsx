import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  INTRO_CAMERA_POSITION,
  INTRO_TARGET,
  FOCUS_CAMERA_POSITION,
  FOCUS_TARGET,
  INTRO_DURATION,
  ANIMATION_DURATION,
  PARALLAX_AMOUNT,
  easeInOut,
  easeOutQuart,
  getInitialCamera,
  getIntroCurves,
  easeInOutCubic,
} from '@/constants/camera';

/** Scratch vectors reused by the per-frame spline sampling (keeps the frame allocation-free). */
const _curvePos = new THREE.Vector3();
const _curveTarget = new THREE.Vector3();

interface CameraControllerProps {
  isDetailOpen: boolean;
  isLoaded: boolean;
  isIntroDone: boolean;
  onIntroDone: () => void;
}

export default function CameraController({
  isDetailOpen,
  isLoaded,
  isIntroDone,
  onIntroDone,
}: CameraControllerProps) {
  const { camera, size } = useThree();
  const introProgress = useRef(0);

  // Resolve responsive initial camera based on current viewport width
  const responsive = getInitialCamera(size.width);

  const animRef = useRef({
    active: false,
    progress: 1,
    startPos: new THREE.Vector3(),
    endPos: responsive.position.clone(),
    startTarget: new THREE.Vector3(),
    endTarget: responsive.target.clone(),
  });

  const currentBasePos = useRef(INTRO_CAMERA_POSITION.clone());
  const currentBaseTarget = useRef(responsive.target.clone());
  const smoothedCameraPos = useRef(INTRO_CAMERA_POSITION.clone());
  const smoothedTarget = useRef(responsive.target.clone());

  useEffect(() => {
    if (!isIntroDone) return;
    const init = getInitialCamera(size.width);
    const anim = animRef.current;
    anim.startPos.copy(currentBasePos.current);
    anim.startTarget.copy(currentBaseTarget.current);
    anim.endPos.copy(
      isDetailOpen ? FOCUS_CAMERA_POSITION : init.position
    );
    anim.endTarget.copy(isDetailOpen ? FOCUS_TARGET : init.target);
    anim.progress = 0;
    anim.active = true;
  }, [isDetailOpen, isIntroDone, size.width]);

  useFrame((state, delta) => {
    // Phase 0: loading — camera stays at the first spline point (on the desk)
    if (!isLoaded) {
      camera.position.copy(INTRO_CAMERA_POSITION);
      camera.lookAt(INTRO_TARGET);
      return;
    }

    // Phase 1: intro fly-through — position and look-at target each follow their
    // own Catmull-Rom spline (desk → lift → responsive rest pose). `getPointAt`
    // keeps the base speed constant along the arc length, so `easeInOut` is
    // the only thing shaping the acceleration.
    if (!isIntroDone) {
      const curves = getIntroCurves(size.width);
      introProgress.current += delta / INTRO_DURATION;
      const p = Math.min(introProgress.current, 1);
      const eased = easeInOutCubic(p);
      curves.position.getPointAt(eased, _curvePos);
      curves.target.getPointAt(eased, _curveTarget);
      currentBasePos.current.copy(_curvePos);
      currentBaseTarget.current.copy(_curveTarget);
      camera.position.copy(currentBasePos.current);
      camera.lookAt(currentBaseTarget.current);
      smoothedCameraPos.current.copy(currentBasePos.current);
      smoothedTarget.current.copy(currentBaseTarget.current);
      if (p >= 1) {
        onIntroDone();
      }
      return;
    }

    // Phase 2: normal operation — camera responds to isDetailOpen and parallax
    const anim = animRef.current;
    if (anim.active) {
      anim.progress += delta / ANIMATION_DURATION;
      const progress = Math.min(anim.progress, 1);
      const eased = easeInOut(progress);
      currentBasePos.current.lerpVectors(anim.startPos, anim.endPos, eased);
      currentBaseTarget.current.lerpVectors(
        anim.startTarget,
        anim.endTarget,
        eased
      );
      if (progress >= 1) anim.active = false;
    }

    smoothedTarget.current.lerp(currentBaseTarget.current, 0.1);

    // Compute parallax-adjusted target (shared across all lookAt calls this frame)
    let pX = 0,
      pY = 0;
    let effectiveTarget: THREE.Vector3 = smoothedTarget.current;

    if (!isDetailOpen) {
      pX = state.pointer.x * PARALLAX_AMOUNT;
      pY = state.pointer.y * PARALLAX_AMOUNT;
      effectiveTarget = smoothedTarget.current
        .clone()
        .add(new THREE.Vector3(pX * 0.05, pY * 0.05, 0));
    }

    camera.position.copy(currentBasePos.current);
    camera.translateX(pX);
    camera.translateY(pY);
    camera.lookAt(effectiveTarget);

    // Smooth position while keeping the same parallax target
    const idealPos = camera.position.clone();
    smoothedCameraPos.current.lerp(idealPos, 0.05);
    camera.position.copy(smoothedCameraPos.current);
    camera.lookAt(effectiveTarget);
  });

  return null;
}
