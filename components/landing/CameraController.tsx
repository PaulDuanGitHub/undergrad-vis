import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  INTRO_CAMERA_POSITION,
  INITIAL_CAMERA_POSITION,
  INITIAL_TARGET,
  FOCUS_CAMERA_POSITION,
  FOCUS_TARGET,
  INTRO_DURATION,
  ANIMATION_DURATION,
  PARALLAX_AMOUNT,
  easeInOut,
  easeOutQuart,
} from '@/constants/camera';

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
  const { camera } = useThree();
  const introProgress = useRef(0);

  const animRef = useRef({
    active: false,
    progress: 1,
    startPos: new THREE.Vector3(),
    endPos: INITIAL_CAMERA_POSITION.clone(),
    startTarget: new THREE.Vector3(),
    endTarget: INITIAL_TARGET.clone(),
  });

  const currentBasePos = useRef(INTRO_CAMERA_POSITION.clone());
  const currentBaseTarget = useRef(INITIAL_TARGET.clone());
  const smoothedCameraPos = useRef(INTRO_CAMERA_POSITION.clone());
  const smoothedTarget = useRef(INITIAL_TARGET.clone());

  useEffect(() => {
    if (!isIntroDone) return;
    const anim = animRef.current;
    anim.startPos.copy(currentBasePos.current);
    anim.startTarget.copy(currentBaseTarget.current);
    anim.endPos.copy(
      isDetailOpen ? FOCUS_CAMERA_POSITION : INITIAL_CAMERA_POSITION
    );
    anim.endTarget.copy(isDetailOpen ? FOCUS_TARGET : INITIAL_TARGET);
    anim.progress = 0;
    anim.active = true;
  }, [isDetailOpen, isIntroDone]);

  useFrame((state, delta) => {
    // Phase 0: loading — camera stays at intro position
    if (!isLoaded) {
      camera.position.copy(INTRO_CAMERA_POSITION);
      camera.lookAt(INITIAL_TARGET);
      return;
    }

    // Phase 1: intro animation — lerp from intro position to initial position
    if (!isIntroDone) {
      introProgress.current += delta / INTRO_DURATION;
      const p = Math.min(introProgress.current, 1);
      const eased = easeOutQuart(p);
      currentBasePos.current.lerpVectors(
        INTRO_CAMERA_POSITION,
        INITIAL_CAMERA_POSITION,
        eased
      );
      camera.position.copy(currentBasePos.current);
      camera.lookAt(INITIAL_TARGET);
      smoothedCameraPos.current.copy(currentBasePos.current);
      smoothedTarget.current.copy(INITIAL_TARGET);
      currentBaseTarget.current.copy(INITIAL_TARGET);
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
