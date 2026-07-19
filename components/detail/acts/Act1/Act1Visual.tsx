"use client";

import React, { useMemo, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera, Html, OrbitControls } from "@react-three/drei";
import file_summary from "@/data/file_summary.json";
import term_empty_days from "@/data/term_empty_days.json";
import * as THREE from "three";

// ── Constants ──
const SPACING = 1.5;
const MIN_HEIGHT = 0.5;
const HOVER_SPEED = 8;
const LERP_SPEED = 5;

// Step 1-3 layout: 4 columns × 2 rows
const GROUP_SPACING_X = 27; 
const GROUP_SPACING_Z = 20; 

// Step 4 layout: 2 columns × 4 rows, leaving horizontal room for the calendar heatmap
const HEATMAP_SPACING_X = 45; 
const HEATMAP_SPACING_Z = 15; 

const COURSE_COLORS = ["#7C2A1F", "#f7b538", "#db7c26", "#d8572a", "#c32f27"].map(c => new THREE.Color(c));
const COLOR_GRAY = new THREE.Color("#94A3B8");
const COLOR_BRAND = new THREE.Color("#D4442E");

const HEATMAP_EMPTY = new THREE.Color("#F5F5F4"); 
const HEATMAP_LOW = new THREE.Color("#FBD5CD");   
const HEATMAP_MID = new THREE.Color("#D4442E");   
const HEATMAP_HIGH = new THREE.Color("#7C2A1F");  

// ── Types ──
export type FileData = { 
  file_name: string;
  total_versions: number;
  term: string;
  course: string;
  created_date: string;
  relative_week: number;
  day_of_week: number;
  daily_count: number;
  is_primary: boolean;
};

type ProcessedCube = {
  isEmptyCube: boolean;
  isPrimaryHeatmap: boolean;
  fileName: string;
  course: string;
  term: string;
  totalVersions: number;
  dailyCount: number;
  dateStr: string;
  gridPos: THREE.Vector3;
  groupPos: THREE.Vector3;
  heatmapPos: THREE.Vector3;
  currentPos: THREE.Vector3;
  colorGray: THREE.Color;
  colorCourse: THREE.Color;
  colorHeatmap: THREE.Color;
  currentColor: THREE.Color;
  minHeight: number;
  fullHeight: number;
  currentHeight: number;
};

interface CubesSceneProps {
  data: FileData[];           
  emptyDaysData: Record<string, {relative_week: number, day_of_week: number}[]>; 
  step: number; 
}

// ── Helpers ──

const getOrdinalNum = (n: number) => n + (n > 0 ? ['th', 'st', 'nd', 'rd'][(n > 3 && n < 21) || n % 10 > 3 ? 0 : n % 10] : '');
const formatDate = (date: Date) => {
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${MONTHS[date.getMonth()]} ${getOrdinalNum(date.getDate())}`;
};

function getTermBaseDates(data: FileData[]): Record<string, Date> {
  const baseDates: Record<string, Date> = {};
  data.forEach(d => {
    if (!baseDates[d.term]) {
      const date = new Date(d.created_date + "T00:00:00");
      date.setDate(date.getDate() - (d.relative_week * 7 + d.day_of_week));
      baseDates[d.term] = date;
    }
  });
  return baseDates;
}

function getHeatmapColor(dailyCount: number): THREE.Color {
  if (dailyCount > 8) return HEATMAP_HIGH.clone();
  if (dailyCount > 3) return HEATMAP_MID.clone();
  return HEATMAP_LOW.clone();
}

function createCubeTemplate(overrides: Partial<ProcessedCube>): ProcessedCube {
  return {
    isEmptyCube: false, isPrimaryHeatmap: false,
    fileName: "", course: "-", term: "", totalVersions: 0, dailyCount: 0, dateStr: "",
    gridPos: new THREE.Vector3(), groupPos: new THREE.Vector3(), heatmapPos: new THREE.Vector3(),
    currentPos: new THREE.Vector3(),
    colorGray: COLOR_GRAY, colorCourse: COLOR_GRAY, colorHeatmap: HEATMAP_EMPTY, currentColor: COLOR_GRAY.clone(),
    minHeight: MIN_HEIGHT * (0.6 + 0.4 * Math.random()), fullHeight: 0, currentHeight: 0,
    ...overrides
  };
}

function getSceneData(data: FileData[], emptyDaysData: CubesSceneProps['emptyDaysData']) {
  const cubeData: ProcessedCube[] = [];
  const termLabels: any[] = [];
  const termBaseDates = getTermBaseDates(data);

  const terms = [
    '2021 Fall', '2022 Winter', '2022 Fall', '2023 Winter', '2023 Fall', '2024 Winter', '2025 Fall', '2026 Winter'
  ]

  // 1+3+3+1 diamond layout: (col, row)
  const LAYOUT_1331 = [
    { c: 1, r: 0 },
    { c: 0, r: 1 },
    { c: 1, r: 1 },
    { c: 2, r: 1 },
    { c: 0, r: 2 },
    { c: 1, r: 2 },
    { c: 2, r: 2 },
    { c: 1, r: 3 },
  ];

  const termBlocks = terms.map((term, index) => {
    const layout = LAYOUT_1331[index] || { c: 0, r: 0 };

    return {
      term,
      // Step 1-3: 1+3+3+1 diamond layout
      groupBaseX: layout.c * GROUP_SPACING_X,
      groupBaseZ: layout.r * GROUP_SPACING_Z,
      
      // Step 4: 2 columns × 4 rows to leave horizontal room for the 15-week heatmap
      heatmapBaseX: (index % 2) * HEATMAP_SPACING_X,
      heatmapBaseZ: Math.floor(index / 2) * HEATMAP_SPACING_Z,
      
      files: data.filter(d => d.term === term).map((f, i) => ({ ...f, localIndex: i, globalIndex: data.indexOf(f) })),
      courses: Array.from(new Set(data.filter(d => d.term === term).map(d => d.course)))
    };
  });

  const GLOBAL_GRID_SIZE = Math.ceil(Math.sqrt(data.length));

  termBlocks.forEach(block => {
    // Term label coordinates
    termLabels.push({ 
      term: block.term, courses: block.courses,
      gridLabelPos: new THREE.Vector3(0, 0, 0),
      groupLabelPos: new THREE.Vector3(block.groupBaseX - 1.5, 0, block.groupBaseZ),
      heatmapLabelPos: new THREE.Vector3(block.heatmapBaseX - 1.5, 0, block.heatmapBaseZ),
      currentPos: new THREE.Vector3(block.groupBaseX - 1.5, 0, block.groupBaseZ) 
    });

    const localGridSize = Math.ceil(Math.sqrt(block.files.length));

    // Generate actual file cubes
    block.files.forEach(file => {
      const gridPos = new THREE.Vector3((file.globalIndex % GLOBAL_GRID_SIZE) * SPACING, 0, Math.floor(file.globalIndex / GLOBAL_GRID_SIZE) * SPACING);
      const groupPos = new THREE.Vector3(block.groupBaseX + (file.localIndex % localGridSize) * SPACING, 0, block.groupBaseZ + Math.floor(file.localIndex / localGridSize) * SPACING);
      const heatmapPos = new THREE.Vector3(block.heatmapBaseX + file.relative_week * SPACING, 0, block.heatmapBaseZ + file.day_of_week * SPACING);
      
      cubeData.push(createCubeTemplate({
        isPrimaryHeatmap: file.is_primary,
        fileName: file.file_name, course: file.course, term: file.term,
        totalVersions: file.total_versions, dailyCount: file.daily_count,
        dateStr: formatDate(new Date(file.created_date + "T00:00:00")),
        gridPos, groupPos, heatmapPos, currentPos: gridPos.clone(),
        colorCourse: COURSE_COLORS[block.courses.indexOf(file.course) % COURSE_COLORS.length],
        colorHeatmap: getHeatmapColor(file.daily_count),
        fullHeight: Math.max(Math.log(file.total_versions + 1) * 2, MIN_HEIGHT + 0.5)
      }));
    });

    // Generate ghost/empty day cubes
    const emptyDays = emptyDaysData[block.term] || [];
    emptyDays.forEach(ghost => {
      const ghostPos = new THREE.Vector3(block.heatmapBaseX + ghost.relative_week * SPACING, 0, block.heatmapBaseZ + ghost.day_of_week * SPACING);
      const ghostDate = new Date(termBaseDates[block.term]);
      ghostDate.setDate(ghostDate.getDate() + ghost.relative_week * 7 + ghost.day_of_week);

      cubeData.push(createCubeTemplate({
        isEmptyCube: true, term: block.term, dateStr: formatDate(ghostDate),
        groupPos: new THREE.Vector3(block.groupBaseX, 0, block.groupBaseZ),
        heatmapPos: ghostPos, currentPos: ghostPos.clone(),
        currentColor: HEATMAP_EMPTY.clone(),
      }));
    });
  });

  // Compute global centering offsets for each of the 3 layout stages
  const gridOffset = new THREE.Vector3(-(GLOBAL_GRID_SIZE * SPACING) / 2, 0, -(GLOBAL_GRID_SIZE * SPACING) / 2);
  
  // Group stage: max 3 cols (indices 0,1,2, center at 1), max 4 rows (indices 0..3, center at 1.5)
  const groupBlocksOffset = new THREE.Vector3(-(1 * GROUP_SPACING_X) - 8, 0, -(1.5 * GROUP_SPACING_Z));
  
  // Heatmap stage: max 2 cols (center at 0.5), max 4 rows (center at 1.5), with manual X adjustment for the wider heatmap
  const heatmapBlocksOffset = new THREE.Vector3(-(0.5 * HEATMAP_SPACING_X) - 8, 0, -(1.5 * HEATMAP_SPACING_Z));

  return { cubeData, termLabels, gridOffset, groupBlocksOffset, heatmapBlocksOffset };
}

function getCubeTargets(cube: ProcessedCube, step: number, isHovered: boolean) {
  let targetPos, targetColor, targetHeight, targetScaleY = 1;

  if (step === 4) {
    targetPos = cube.heatmapPos;
    targetColor = cube.colorHeatmap.clone();
    if (isHovered) targetColor.lerp(new THREE.Color("white"), 0.3);

    targetHeight = cube.isEmptyCube ? 0.2 : 0.4;
    targetScaleY = cube.isEmptyCube ? 1 : (cube.isPrimaryHeatmap ? 1 : 0);
  } else {
    targetPos = step === 0 ? cube.gridPos : cube.groupPos;
    
    if (cube.isEmptyCube) {
      return { targetPos, targetColor: COLOR_GRAY, targetHeight: 0, targetScaleY: 0 };
    }

    targetColor = cube.colorGray;
    if (step >= 2) targetColor = cube.colorCourse;
    if (isHovered) targetColor = step >= 2 ? cube.colorCourse.clone().lerp(new THREE.Color("white"), 0.5) : COLOR_BRAND;
    
    targetHeight = (step === 3 || isHovered) ? cube.fullHeight : cube.minHeight;
  }

  return { targetPos, targetColor, targetHeight, targetScaleY };
}

// ── 3D Scene Component ──
export function CubesScene({ data, emptyDaysData, step }: CubesSceneProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const groupContainerRef = useRef<THREE.Group>(null);
  const tooltipGroupRef = useRef<THREE.Group>(null);
  const labelGroupRefs = useRef<(THREE.Group | null)[]>([]);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const hoveredRef = useRef(-1);
  const [hoveredIdx, setHoveredIdx] = useState(-1);

  const { cubeData, termLabels, gridOffset, groupBlocksOffset, heatmapBlocksOffset } = useMemo(
    () => getSceneData(data, emptyDaysData), 
    [data, emptyDaysData]
  );

  const { camera, size } = useThree();

  const handlePointerEnter = useCallback((e: any) => {
    e.stopPropagation();
    if (e.instanceId != null) {
      hoveredRef.current = e.instanceId;
      setHoveredIdx(e.instanceId);
    }
  }, []);

  const handlePointerLeave = useCallback((e: any) => {
    e.stopPropagation();
    hoveredRef.current = -1;
    setHoveredIdx(-1);
  }, []);

  // Design reference: at 931px canvas width, the current layout fits exactly without clipping
  const BASE_CANVAS_WIDTH = 931;

  const getBaseZoom = (s: number) => {
    switch (s) {
      case 0: return 14;
      case 4: return 9;
      default: return 11;
    }
  };

  const getTargetCameraPos = () => {
    return step === 4 ? new THREE.Vector3(0.01, 120, 1) : new THREE.Vector3(-60, 80, 60);
  };

  const getTargetCameraZoom = () => {
    const base = getBaseZoom(step);
    // On narrow screens, scale zoom down proportionally to maintain visible world-space area.
    // On wide screens, keep the design value (don't scale up).
    const scale = Math.min(1, size.width / BASE_CANVAS_WIDTH);
    return base * scale;
  };

  // Frame Loop: lerp camera, cubes, labels, and tooltip
  useFrame((_, delta) => {
    const orthoCam = camera as THREE.OrthographicCamera;
    const targetCamPos = getTargetCameraPos();
    const targetZoom = getTargetCameraZoom(); 
    
    orthoCam.position.lerp(targetCamPos, delta * LERP_SPEED * 0.8);
    orthoCam.zoom += (targetZoom - orthoCam.zoom) * delta * LERP_SPEED * 0.8;
    orthoCam.updateProjectionMatrix();
    orthoCam.lookAt(0, 0, 0);

    if (!meshRef.current || !groupContainerRef.current) return;
    const isInteractive = step !== 3;

    // Cubes Lerp
    for (let i = 0; i < cubeData.length; i++) {
      const cube = cubeData[i];
      const isHovered = isInteractive && hoveredRef.current === i;
      
      const { targetPos, targetColor, targetHeight, targetScaleY } = getCubeTargets(cube, step, isHovered);

      cube.currentPos.lerp(targetPos, delta * LERP_SPEED);
      cube.currentHeight += (targetHeight - cube.currentHeight) * Math.min(delta * (isHovered ? HOVER_SPEED : LERP_SPEED), 1);
      cube.currentColor.lerp(targetColor, delta * HOVER_SPEED);

      const scaleY = Math.max(cube.currentHeight * targetScaleY, 0.0001); 
      dummy.position.set(cube.currentPos.x, scaleY / 2, cube.currentPos.z);
      dummy.scale.set(targetScaleY > 0 ? 1 : 0.001, scaleY, targetScaleY > 0 ? 1 : 0.001);
      dummy.updateMatrix();
      
      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, cube.currentColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;

    // Container Offset Lerp
    let targetOffset = groupBlocksOffset;
    if (step === 0) targetOffset = gridOffset;
    if (step === 4) targetOffset = heatmapBlocksOffset;
    groupContainerRef.current.position.lerp(targetOffset, delta * LERP_SPEED);

    // Label position tracking
    for (let i = 0; i < termLabels.length; i++) {
      const labelData = termLabels[i];
      let targetLabelPos = labelData.groupLabelPos;

      if (step === 0) targetLabelPos = labelData.gridLabelPos;
      if (step === 4) targetLabelPos = labelData.heatmapLabelPos;
      
      labelData.currentPos.lerp(targetLabelPos, delta * LERP_SPEED);
      
      if (labelGroupRefs.current[i]) {
        labelGroupRefs.current[i]!.position.copy(labelData.currentPos);
      }
    }

    // Tooltip Tracker
    if (hoveredRef.current !== -1 && tooltipGroupRef.current) {
      const activeCube = cubeData[hoveredRef.current];
      tooltipGroupRef.current.position.copy(activeCube.currentPos);
      tooltipGroupRef.current.position.y = activeCube.currentHeight + 1.5; 
    }
  });

  const tooltipData = hoveredIdx !== -1 ? cubeData[hoveredIdx] : null;

return (
    <group ref={groupContainerRef}>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, cubeData.length]}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={step === 4 ? 1 : 0.8} />
      </instancedMesh>

      {/* --- Tooltip --- */}
      <group ref={tooltipGroupRef}>
        <Html className="pointer-events-none transition-opacity duration-200 z-9999" style={{ opacity: hoveredIdx !== -1 && step !== 3 ? 1 : 0 }}>
          {tooltipData && (
            <div className="absolute right-5 bg-white/95 backdrop-blur-md px-4 py-3 rounded-xl shadow-xl border border-slate-200 whitespace-nowrap">
              {step < 3 && !tooltipData.isEmptyCube ? (
                <>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
                    {tooltipData.term} <span className="mx-1">//</span> {tooltipData.course}
                  </div>
                  <div className="text-lg font-serif text-slate-900 mb-1">{tooltipData.fileName} file</div>
                  <div className="text-xs text-slate-600">
                    Total Versions: <span className="font-bold text-brand">{tooltipData.totalVersions}</span>
                  </div>
                </>
              ) : (step === 4 && (
                <div className="text-sm font-serif text-slate-900 leading-relaxed">
                  <span className="font-bold text-brand text-base">{tooltipData.dailyCount}</span> 
                  {' '}work {tooltipData.dailyCount === 1 ? 'file was' : 'files were'} created on<br />
                  <span className="italic text-slate-600">{tooltipData.dateStr}</span>
                </div>
              ))}
            </div>
          )}
        </Html>
      </group>

      {/* Term Labels & Y-Axis */}
      {termLabels.map((label, idx) => (
        <group key={idx} ref={(el) => { labelGroupRefs.current[idx] = el; }}>
          
          {/* Term heading & course legend */}
          <Html 
            transform
            rotation={[-Math.PI / 2, 0, 0]}
            className="pointer-events-none transition-opacity duration-700" 
            style={{ opacity: step >= 1 ? 1 : 0 }}
          >
            {/* 3x Supersampling: render at triple resolution then CSS-scale down for sharper CSS3D */}
            <div style={{ transform: 'scale(0.333)', transformOrigin: 'center center' }}>
              <div className="absolute pr-12 right-0 text-right flex flex-col items-end w-max -translate-y-12" style={{ top: (step === 4) ? '-240px' : '240px' }}>
                <span className="font-light text-slate-900 mb-3" style={{ fontSize: '13rem', lineHeight: '1' }}>{label.term}</span>
                <div className="flex flex-col items-end gap-8 overflow-hidden transition-all duration-700" style={{ maxHeight: (step === 2 || step === 3) ? '900px' : '0px', opacity: (step === 2 || step === 3) ? 1 : 0 }}>
                  {label.courses.map((course: string, cIdx: number) => (
                    <div key={course} className="flex items-center gap-6" style={{ fontSize: '2.625rem', color: '#475569' }}>
                      <span style={{ fontSize: '9rem', lineHeight: '1' }}>{course}</span>
                      <span className="rounded-full" style={{ width: '72px', height: '72px', backgroundColor: `#${COURSE_COLORS[cIdx % COURSE_COLORS.length].getHexString()}` }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Html>

          {/* Y-axis: Day-of-week labels (Step 4 only) */}
          {/* Monday */}
          <Html position={[0, 0, 1 * SPACING]} className="pointer-events-none transition-opacity duration-700" style={{ opacity: step === 4 ? 1 : 0 }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 font-serif text-[10px] text-slate-400 uppercase tracking-widest">
              Mon
            </div>
          </Html>

          {/* Wednesday */}
          <Html position={[0, 0, 3 * SPACING]} className="pointer-events-none transition-opacity duration-700" style={{ opacity: step === 4 ? 1 : 0 }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 font-serif text-[10px] text-slate-400 uppercase tracking-widest">
              Wed
            </div>
          </Html>

          {/* Friday */}
          <Html position={[0, 0, 5 * SPACING]} className="pointer-events-none transition-opacity duration-700" style={{ opacity: step === 4 ? 1 : 0 }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 font-serif text-[10px] text-slate-400 uppercase tracking-widest">
              Fri
            </div>
          </Html>

        </group>
      ))}
    </group>
  );
}

// ── Entry Point ──
export default function Act1Visual({ step }: { step: number }) {
  return (
    <div className="w-full h-full flex-col items-center justify-center overflow-visible">
      <Canvas shadows style={{ overflow: 'visible' }}>
        <OrthographicCamera makeDefault zoom={14} near={0.1} far={1000} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={2} castShadow />
        <CubesScene data={file_summary as FileData[]} emptyDaysData={term_empty_days} step={step} />
      </Canvas>
    </div>
  );
}