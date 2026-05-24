"use client";
import React from "react";
import ThreeVoxelHeatmap from "@/components/ThreeVoxelHeatmap";

interface DetailVisualProps {
  isContentVisible: boolean;
  currentData: Record<string, unknown>;
}

export default function DetailVisual({
  isContentVisible,
  currentData,
}: DetailVisualProps) {
  return (
    <div
      className={`w-[60%] h-full flex items-center justify-center`}
    >
      <div className="w-full h-full pointer-events-auto">
        {/* <ThreeVoxelHeatmap jsonData={currentData} /> */}
      </div>
    </div>
  );
}
