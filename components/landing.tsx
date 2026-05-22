'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment, useTexture, useProgress } from "@react-three/drei";
import * as THREE from "three";

// ==========================================
// 1. 常量定义区 (Constants)
// ==========================================
const INTRO_CAMERA_POSITION = new THREE.Vector3(0.5, 0.6, 2.5); // 新增：远景初始点
const INITIAL_CAMERA_POSITION = new THREE.Vector3(0.06678, 0.239, 1.00088);
const INITIAL_TARGET = new THREE.Vector3(-0.01668, 0.06838, -0.02268);

const FOCUS_TARGET = new THREE.Vector3(-0.0024912275795889805, 0.06838, -0.022594858756803872);
const FOCUS_CAMERA_POSITION = new THREE.Vector3(
  -0.00494750987069966, 
  0.7149492477247782,
  0.3867441306164585
);

const INTRO_DURATION = 1;     // 进场动画时间 (秒)，设定长一点更具电影感
const ANIMATION_DURATION = 0.8; // 视图切换动画时间 (秒)
const PARALLAX_AMOUNT = 0.015;

const easeInOut = (t: number) => 0.5 * (1 - Math.cos(Math.PI * t));
// 进场用的缓出曲线 (类似 easeOutQuart)，开始快，结尾极慢地停下，非常有高级感
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4); 

// ==========================================
// 2. 场景与模型组件
// ==========================================

function Model({ activeView }: { activeView: boolean }) {
  const { scene, animations } = useGLTF("/model/desk_web_3_baked_animation.glb");

  const mixer = useMemo(() => {
    return animations.length ? new THREE.AnimationMixer(scene) : null;
  }, [scene, animations]);

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

    animations.forEach((clip) => {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;

      if (activeView) {
        action.timeScale = 1;
        action.paused = false;
        action.play();
      } else {
        if (action.time > 0) {
          action.timeScale = -1;
          action.paused = false;
          action.play();
        }
      }
    });
  }, [activeView, mixer, animations]);

  useFrame((_, delta) => {
    if (mixer) mixer.update(delta);
  });

  return <primitive object={scene} />;
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

// ==========================================
// 3. 高级相机控制器 (Camera Rig)
// ==========================================

function CameraController({ 
  activeView, 
  appReady, 
  onIntroFinish 
}: { 
  activeView: boolean;
  appReady: boolean;
  onIntroFinish: () => void;
}) {
  const { camera } = useThree();
  
  // phase: 0=等待加载, 1=进场推进中, 2=正式就绪
  const phase = useRef<0 | 1 | 2>(0);
  const introProgress = useRef(0);

  const animRef = useRef({
    active: false,
    progress: 1,
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3().copy(INITIAL_CAMERA_POSITION),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3().copy(INITIAL_TARGET),
  });

  const currentBasePos = useRef(new THREE.Vector3().copy(INTRO_CAMERA_POSITION));
  const currentBaseTarget = useRef(new THREE.Vector3().copy(INITIAL_TARGET));
  const smoothedCameraPos = useRef(new THREE.Vector3().copy(INTRO_CAMERA_POSITION));
  const smoothedTarget = useRef(new THREE.Vector3().copy(INITIAL_TARGET));

  // 监听 appReady (加载完毕遮罩消失)，开始进入 Intro Phase
  useEffect(() => {
    if (appReady && phase.current === 0) {
      phase.current = 1; // 切换到进场阶段
    }
  }, [appReady]);

  // 监听视图切换（仅在 phase === 2 时生效）
  useEffect(() => {
    if (phase.current !== 2) return;
    const anim = animRef.current;
    anim.startPos.copy(currentBasePos.current);
    anim.startTarget.copy(currentBaseTarget.current);
    anim.endPos.copy(activeView ? FOCUS_CAMERA_POSITION : INITIAL_CAMERA_POSITION);
    anim.endTarget.copy(activeView ? FOCUS_TARGET : INITIAL_TARGET);
    anim.progress = 0;
    anim.active = true;
  }, [activeView]);

  useFrame((state, delta) => {
    // Phase 0: 加载中，锁死在远景
    if (phase.current === 0) {
      camera.position.copy(INTRO_CAMERA_POSITION);
      camera.lookAt(INITIAL_TARGET);
      return;
    }

    // Phase 1: 进场推进动画
    if (phase.current === 1) {
      introProgress.current += delta / INTRO_DURATION;
      const p = Math.min(introProgress.current, 1);
      const eased = easeOutQuart(p);

      // 从远景推入初始视角
      currentBasePos.current.lerpVectors(INTRO_CAMERA_POSITION, INITIAL_CAMERA_POSITION, eased);
      camera.position.copy(currentBasePos.current);
      camera.lookAt(INITIAL_TARGET);

      // 同步中间变量，防止动画结束瞬间闪烁
      smoothedCameraPos.current.copy(currentBasePos.current);
      smoothedTarget.current.copy(INITIAL_TARGET);
      currentBaseTarget.current.copy(INITIAL_TARGET);

      if (p >= 1) {
        phase.current = 2; // 进场完毕
        onIntroFinish();   // 通知 UI 进场
      }
      return; // 推进期间禁止鼠标视差，保持电影感
    }

    // Phase 2: 正式就绪 (包含 Init/Focus 切换与鼠标视差)
    if (phase.current === 2) {
      const anim = animRef.current;

      if (anim.active) {
        anim.progress += delta / ANIMATION_DURATION;
        const progress = Math.min(anim.progress, 1);
        const eased = easeInOut(progress);

        currentBasePos.current.lerpVectors(anim.startPos, anim.endPos, eased);
        currentBaseTarget.current.lerpVectors(anim.startTarget, anim.endTarget, eased);

        if (progress >= 1) anim.active = false;
      }

      smoothedTarget.current.lerp(currentBaseTarget.current, 0.1);

      camera.position.copy(currentBasePos.current);
      camera.lookAt(smoothedTarget.current);

      if(!activeView) {
        const parallaxX = state.pointer.x * PARALLAX_AMOUNT;
        const parallaxY = state.pointer.y * PARALLAX_AMOUNT;
        
        camera.translateX(parallaxX);
        camera.translateY(parallaxY);
        camera.lookAt(smoothedTarget.current.add(new THREE.Vector3(parallaxX * 0.05, parallaxY * 0.05, 0))); // 视差时相机微调焦点，增强沉浸感
      }
      const idealPos = camera.position.clone();
      smoothedCameraPos.current.lerp(idealPos, 0.05);

      camera.position.copy(smoothedCameraPos.current);
      camera.lookAt(smoothedTarget.current);
    }
  });

  return null;
}

// ==========================================
// 4. 加载遮罩层组件 (Loading Overlay)
// ==========================================

function LoadingOverlay({ appReady }: { appReady: boolean }) {
  const { progress } = useProgress();

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FAF8F5] transition-all duration-[1000ms] ease-in-out ${
        appReady ? "opacity-0 pointer-events-none scale-105" : "opacity-100 scale-100"
      }`}
    >
      <div className="text-xs tracking-[0.3em] text-amber-900/60 font-serif mb-4">
        PREPARING EXPERIENCE
      </div>
      {/* 极简进度条 */}
      <div className="w-48 h-[1px] bg-amber-900/10 overflow-hidden relative">
        <div 
          className="absolute top-0 left-0 h-full bg-amber-500 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ==========================================
// 5. 主页面组件 (Main Page Component)
// ==========================================

export default function Landing() {
  const { progress } = useProgress();
  
  const [appReady, setAppReady] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const [activeView, setActiveView] = useState(false);
  const wheelLockRef = useRef(false);

  // 当加载进度 100% 时，延迟一点点再消失遮罩，让画面渲染稳固
  useEffect(() => {
    if (progress === 100) {
      const timer = setTimeout(() => {
        setAppReady(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  const toggleView = () => {
    if (!introFinished) return; // 进场动画没播完前，禁止点击切换
    setActiveView((prev) => !prev);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!introFinished || wheelLockRef.current) return; // 进场没播完前，禁止滚轮切换
    
    wheelLockRef.current = true;
    toggleView();
    
    setTimeout(() => {
      wheelLockRef.current = false;
    }, 500); 
  };

  return (
    <div className="h-screen w-screen bg-linear-to-b from-[#FAF8F5] to-[#FFFFFF] flex flex-col flex-1 items-center justify-start font-serif overflow-hidden">
      
      {/* 全屏极简 Loading 层 */}
      <LoadingOverlay appReady={appReady} />

      {/* 核心 UI 层 */}
      <div 
        className={`fixed top-0 flex flex-col flex-1 items-center justify-start pointer-events-none z-10 
          transition-all duration-800 ease-out
          ${activeView ? "opacity-0 -translate-y-12" : ""}
        `}
      >
        <div className="mt-10">My 2021 - 2026</div>
        <h1 className="mt-6 text-6xl">Productivity</h1>
        <hr className="w-15 border-t border-3 border-amber-200 my-6 transition-all duration-800 delay-300" />
        <div className="italic text-center px-4">
          Reporting & <span className="bg-amber-200 text-amber-900 px-1 py-1 rounded">Visualization</span> for Undergraduate Academics
        </div>
        <div className={`mt-6 ${activeView || !introFinished ? "pointer-events-none" : "pointer-events-auto"}`}>
          By <a href="https://www.xianzhaoduan.com" target="_blank" rel="noreferrer" className="underline hover:text-amber-600 transition-colors">Paul Duan</a>
        </div>
      </div>

      {/* 3D 渲染区域 */}
      <div 
        className={`w-screen h-screen ${appReady ? "cursor-pointer" : "cursor-wait"}`} 
        onClick={toggleView} 
        onWheel={handleWheel}
      >
        <Canvas
          shadows
          gl={{
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
            alpha: true,
            antialias: true,
          }}
          camera={{
            fov: 45,
            position: INTRO_CAMERA_POSITION.toArray(),
          }}
        >
          <Environment preset="city" environmentIntensity={1.5} />

          <Suspense fallback={null}>
            <Floor />
            <Model activeView={activeView} />
          </Suspense>

          <CameraController 
            activeView={activeView} 
            appReady={appReady} 
            onIntroFinish={() => setIntroFinished(true)} 
          />
        </Canvas>
      </div>
    </div>
  );
}

useGLTF.preload("/model/desk_web_3_baked_animation.glb");