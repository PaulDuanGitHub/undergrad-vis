"use client";
import React, { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, useProgress } from "@react-three/drei";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { INTRO_CAMERA_POSITION } from "@/constants/camera";
import ThreeScene from "@/components/landing/ThreeScene";
import CameraController from "@/components/landing/CameraController";
import LoadingOverlay from "@/components/landing/LoadingOverlay";
import DetailView from "@/components/detail/DetailView";

export default function Landing() {
  const { progress } = useProgress();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isIntroDone, setIsIntroDone] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const wheelLockRef = useRef(false);

  // ── Touch swipe state ──
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const SWIPE_THRESHOLD = 50; // min px to trigger swipe

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

  // Scroll to top when detail view opens
  useEffect(() => {
    if (isDetailOpen && leftScrollRef.current) {
      leftScrollRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [isDetailOpen]);

  // ── Touch swipe: up → enter detail, down → exit detail ──
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isIntroDone || wheelLockRef.current) return;
    const touch = e.changedTouches[0];
    const deltaY = touchStartRef.current.y - touch.clientY;
    const deltaX = touchStartRef.current.x - touch.clientX;
    const elapsed = Date.now() - touchStartRef.current.time;

    // Only trigger swipe if vertical movement dominates and it's a quick gesture (<500ms)
    if (Math.abs(deltaY) > Math.abs(deltaX) && elapsed < 500 && Math.abs(deltaY) > SWIPE_THRESHOLD) {
      wheelLockRef.current = true;
      if (deltaY > 0) {
        // Swipe up → enter detail
        if (!isDetailOpen) openDetail();
      } else {
        // Swipe down → exit detail
        if (isDetailOpen) closeDetail();
      }
      setTimeout(() => (wheelLockRef.current = false), 800);
    }
  };

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!isIntroDone || wheelLockRef.current) return;
      if (!isDetailOpen && e.deltaY > 0) {
        wheelLockRef.current = true;
        openDetail();
        setTimeout(() => (wheelLockRef.current = false), 800);
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [isIntroDone, isDetailOpen]);

  return (
    <div
      className={`relative h-screen w-screen flex flex-col flex-1 items-center justify-start font-serif overflow-hidden select-none transition-colors duration-1000 ease-in-out ${
        isDetailOpen ? "bg-surface" : "bg-surface"
      }`}
    >
      <LoadingOverlay isLoaded={isLoaded} />

      <div
        className={`fixed top-0 flex flex-col flex-1 items-center justify-start pointer-events-none z-10 transition-all duration-600 ease-out ${
          isDetailOpen ? "opacity-0 -translate-y-12" : "opacity-100 translate-y-0"
        }`}
      >
        <div className="mt-6 sm:mt-10 text-text-secondary text-xs sm:text-sm tracking-wider">My 2021 - 2026</div>
        <h1 className="my-4 sm:my-6 text-4xl sm:text-5xl md:text-6xl text-text-primary tracking-tight">Productivity</h1>
        <div className="italic text-center px-4 text-text-secondary text-sm sm:text-base">
          A <span className="font-bold">visualization</span> of over 600 workfiles created during my undergraduate.
        </div>
        <div className="mt-4 sm:mt-6 pointer-events-auto">
          By <a href="https://www.xianzhaoduan.com" target="_blank" rel="noreferrer" className="underline hover:text-brand transition-colors">Paul Duan</a>
        </div>
      </div>

      <DetailView
        scrollRef={leftScrollRef}
        isDetailVisible={isDetailVisible}
        onExit={closeDetail}
      />

      <div
        className={`absolute inset-0 w-screen h-screen z-0 ${isLoaded ? "cursor-pointer" : "cursor-wait"}`}
        onClick={toggleView}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        data-touch-lock
      >
        <Canvas
          shadows
          gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0, alpha: true, antialias: true }}
          camera={{ fov: 45, position: INTRO_CAMERA_POSITION.toArray() }}
        >
          <ambientLight intensity={3.5} />
          <Suspense fallback={null}>
            <ThreeScene isDetailOpen={isDetailOpen} onPaperCovered={setIsDetailVisible} />
          </Suspense>
          <CameraController isDetailOpen={isDetailOpen} isLoaded={isLoaded} isIntroDone={isIntroDone} onIntroDone={() => setIsIntroDone(true)} />
        </Canvas>
      </div>
    </div>
  );
}

// Preload the 3D model
useGLTF.preload("/model/desk_web_3_baked_animation.glb");