"use client";
import React, { useState, useEffect, useRef, RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import DetailNarrative from "./DetailNarrative";
import DetailVisual from "./DetailVisual";
import type { NarrativeSection } from "./DetailNarrative";

// Register GSAP plugin
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Import all JSON data files
import data2021Fall from "@/data/pivot_2021_Fall.json";
import data2022Winter from "@/data/pivot_2022_Winter.json";
import data2022Fall from "@/data/pivot_2022_Fall.json";
import data2023Winter from "@/data/pivot_2023_Winter.json";
import data2023Fall from "@/data/pivot_2023_Fall.json";
import data2024Winter from "@/data/pivot_2024_Winter.json";
import data2025Fall from "@/data/pivot_2025_Fall.json";
import data2026Winter from "@/data/pivot_2026_Winter.json";

interface SectionData {
  id: string;
  data: Record<string, unknown>;
  title: string;
  description: string;
}

const sections: SectionData[] = [
  { id: "2021-fall", data: data2021Fall, title: "Fall 2021", description: "Initial semester with moderate activity. Students were adapting to new learning patterns." },
  { id: "2022-winter", data: data2022Winter, title: "Winter 2022", description: "Winter break period showing reduced engagement across most days." },
  { id: "2022-fall", data: data2022Fall, title: "Fall 2022", description: "Fall semester resurgence with increased participation across all weeks." },
  { id: "2023-winter", data: data2023Winter, title: "Winter 2023", description: "New year beginning with steady growth in student interactions." },
  { id: "2023-fall", data: data2023Fall, title: "Fall 2023", description: "Strong fall performance with peak engagement during mid-semester." },
  { id: "2024-winter", data: data2024Winter, title: "Winter 2024", description: "Winter session showing consistent activity patterns." },
  { id: "2025-fall", data: data2025Fall, title: "Fall 2025", description: "Record-breaking semester with highest overall engagement." },
  { id: "2026-winter", data: data2026Winter, title: "Winter 2026", description: "Current winter term showing continued growth trajectory." },
];

const narrativeSections: NarrativeSection[] = sections.map(({ id, title, description }) => ({
  id,
  title,
  description,
}));

interface DetailViewProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  isContentVisible: boolean;
}

export default function DetailView({ scrollRef, isContentVisible }: DetailViewProps) {
  const [activeSection, setActiveSection] = useState(0);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const currentData = sections[activeSection].data;

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    // Create ScrollTriggers for each section
    const triggers: ScrollTrigger[] = [];
    sectionRefs.current.forEach((section, index) => {
      if (!section) return;
      const trigger = ScrollTrigger.create({
        trigger: section,
        scroller: container,
        start: "top center",
        end: "bottom center",
        onEnter: () => setActiveSection(index),
        onEnterBack: () => setActiveSection(index),
      });
      triggers.push(trigger);
    });

    ScrollTrigger.refresh();

    return () => {
      triggers.forEach((t) => t.kill());
    };
  }, [scrollRef]);

  return (
    <div className={`absolute inset-0 w-full h-full flex transition-all duration-500 ease-out ${
        isContentVisible
          ? "opacity-100 scale-100 z-20"
          : "opacity-0 scale-98 pointer-events-none"
      }`}
    >
      <DetailNarrative
        scrollRef={scrollRef}
        isContentVisible={isContentVisible}
        sections={narrativeSections}
        activeSection={activeSection}
        sectionRefs={sectionRefs}
      />
      <DetailVisual
        isContentVisible={isContentVisible}
        currentData={currentData}
      />
    </div>
  );
}
