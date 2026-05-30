"use client";
import React, { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, useProgress } from "@react-three/drei";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { INTRO_CAMERA_POSITION } from "@/constants/camera";
import ThreeScene from "@/components/ThreeScene";
import CameraController from "@/components/CameraController";
import LoadingOverlay from "@/components/LoadingOverlay";
import DetailView from "@/components/detail/DetailView";
// import SVGVisualizer from "@/components/SVGVisualizer";

export default function Landing() {
  const { progress } = useProgress();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isIntroDone, setIsIntroDone] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const wheelLockRef = useRef(false);

  useEffect(() => {
    if (progress === 100) {
      const timer = setTimeout(() => setIsLoaded(true), 300);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  const closeDetail = () => {
    setIsDetailVisible(false);
    setTimeout(() => setIsDetailOpen(false), 150);
  };

  const openDetail = () => setIsDetailOpen(true);

  const toggleView = () => {
    if (!isIntroDone) return;
    isDetailOpen ? closeDetail() : openDetail();
  };

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!isIntroDone || wheelLockRef.current) return;
      if (!isDetailOpen && e.deltaY > 0) {
        wheelLockRef.current = true;
        openDetail();
        setTimeout(() => (wheelLockRef.current = false), 800);
      } else if (isDetailOpen && leftScrollRef.current) {
        const { scrollTop } = leftScrollRef.current;
        if (scrollTop <= 0 && e.deltaY < 0) {
          wheelLockRef.current = true;
          closeDetail();
          setTimeout(() => (wheelLockRef.current = false), 800);
        }
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [isIntroDone, isDetailOpen]);

  return (
    <div
      className={`h-screen w-screen flex flex-col flex-1 items-center justify-start font-serif overflow-hidden select-none transition-colors duration-1000 ease-in-out ${
        isDetailOpen ? "bg-[#DEE1E1]" : "bg-[#FAF8F5]"
      }`}
    >
      <LoadingOverlay isLoaded={isLoaded} />

      <div
        className={`fixed top-0 flex flex-col flex-1 items-center justify-start pointer-events-none z-10 transition-all duration-600 ease-out ${
          isDetailOpen ? "opacity-0 -translate-y-12" : "opacity-100 translate-y-0"
        }`}
      >
        <div className="mt-10 text-stone-600 text-sm tracking-wider">My 2021 - 2026</div>
        <h1 className="mt-6 text-6xl text-stone-850 tracking-tight">Productivity</h1>
        <hr className="w-16 border-t border-[1.5px] border-amber-300 my-6" />
        <div className="italic text-center px-4 text-stone-600">
          Reporting & <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-sm">Visualization</span> for Undergraduate Academics
        </div>
        <div className="mt-6 pointer-events-auto">
          By <a href="https://www.xianzhaoduan.com" target="_blank" rel="noreferrer" className="underline hover:text-amber-700 transition-colors">Paul Duan</a>
        </div>
      </div>

      <DetailView
        scrollRef={leftScrollRef}
        isDetailVisible={isDetailVisible}
      />

      <div className={`absolute inset-0 w-screen h-screen z-0 ${isLoaded ? "cursor-pointer" : "cursor-wait"}`} onClick={toggleView}>
        <Canvas
          shadows
          gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0, alpha: true, antialias: true }}
          camera={{ fov: 45, position: INTRO_CAMERA_POSITION.toArray() }}
        >
          <Environment preset="city" environmentIntensity={1.5} />
          <Suspense fallback={null}>
            <ThreeScene isDetailOpen={isDetailOpen} onPaperCovered={setIsDetailVisible} />
          </Suspense>
          <CameraController isDetailOpen={isDetailOpen} isLoaded={isLoaded} isIntroDone={isIntroDone} onIntroDone={() => setIsIntroDone(true)} />
        </Canvas>
      </div>
    </div>
  );
}

// 预加载模型
useGLTF.preload("/model/desk_web_3_baked_animation.glb");