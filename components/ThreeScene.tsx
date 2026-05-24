import React, { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";

interface ThreeSceneProps {
  isDetailOpen: boolean;
  onTransitionComplete: (completedView: boolean) => void;
}

function Floor() {
  const shadowMap = useTexture("/model/floor_bake.png");
  useMemo(() => {
    shadowMap.flipY = false;
    shadowMap.colorSpace = THREE.SRGBColorSpace;
  }, [shadowMap]);

  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[-0.01, -0.48, 0.12]}>
      <planeGeometry args={[3, 3]} />
      <meshBasicMaterial map={shadowMap} transparent opacity={0.85} depthWrite={false} />
    </mesh>
  );
}

export default function ThreeScene({ isDetailOpen, onTransitionComplete }: ThreeSceneProps) {
  const { scene, animations } = useGLTF("/model/desk_web_3_baked_animation.glb");
  const mixer = useMemo(() => (animations.length ? new THREE.AnimationMixer(scene) : null), [scene, animations]);

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
      if (isDetailOpen) onTransitionComplete(true);
    };

    mixer.addEventListener("finished", onFinished);
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
        onTransitionComplete(false);
      }
    }
    return () => {
      mixer.removeEventListener("finished", onFinished);
    };
  }, [isDetailOpen, mixer, animations, onTransitionComplete]);

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