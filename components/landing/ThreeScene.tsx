import React, { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface ThreeSceneProps {
  isDetailOpen: boolean;
  onPaperCovered: (completedView: boolean) => void;
}

const SHADOW_OFFSET_X = -0.01;
const SHADOW_OFFSET_Y = -0.48;
const SHADOW_OFFSET_Z = 0.12;
const SHADOW_SIZE = 3;
const SHADOW_OPACITY = 0.85;
const SHADOW_TEXTURE_PATH = './model/floor_bake.png';

function Floor() {
  const shadowMap = useTexture(SHADOW_TEXTURE_PATH);
  useMemo(() => {
    shadowMap.flipY = false;
    shadowMap.colorSpace = THREE.SRGBColorSpace;
  }, [shadowMap]);

  return (
    <mesh
      receiveShadow
      rotation={[-Math.PI / 2, 0, 0]}
      position={[SHADOW_OFFSET_X, SHADOW_OFFSET_Y, SHADOW_OFFSET_Z]}
    >
      <planeGeometry args={[SHADOW_SIZE, SHADOW_SIZE]} />
      <meshBasicMaterial
        map={shadowMap}
        transparent
        opacity={SHADOW_OPACITY}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function ThreeScene({
  isDetailOpen,
  onPaperCovered,
}: ThreeSceneProps) {
  const { scene, animations } = useGLTF(
    './model/desk_web_3_baked_animation.glb'
  );
  const mixer = useMemo(
    () => (animations.length ? new THREE.AnimationMixer(scene) : null),
    [scene, animations]
  );

  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const material = mesh.material as THREE.MeshStandardMaterial;
        if (!Array.isArray(material) && material?.map) {
          mesh.material = new THREE.MeshBasicMaterial({ map: material.map });
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    scene.position.sub(center);
  }, [scene]);

  useEffect(() => {
    if (!mixer || !animations.length) return;
    const clip = animations[0];
    const action = mixer.clipAction(clip);

    const onFinished = () => {
      if (isDetailOpen) onPaperCovered(true);
    };

    mixer.addEventListener('finished', onFinished);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;

    if (isDetailOpen) {
      action.timeScale = 1;
      action.paused = false;
      action.play();
    } else {
      if (action.time > 0) {
        action.timeScale = -1;
        action.paused = false;
        action.play();
        onPaperCovered(false);
      }
    }
    return () => {
      mixer.removeEventListener('finished', onFinished);
    };
  }, [isDetailOpen, mixer, animations, onPaperCovered]);

  useFrame((_, delta) => {
    mixer?.update(delta);
  });

  return (
    <>
      <primitive object={scene} />
      <Floor />
    </>
  );
}
