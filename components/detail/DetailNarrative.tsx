"use client";
import React, { RefObject } from "react";

export interface NarrativeSection {
  id: string;
  title: string;
  description: string;
}

interface DetailNarrativeProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  isContentVisible: boolean;
  sections: NarrativeSection[];
  activeSection: number;
  sectionRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

export default function DetailNarrative({
  scrollRef,
  isContentVisible,
  sections,
  activeSection,
  sectionRefs,
}: DetailNarrativeProps) {
  return (
    <div
      ref={scrollRef}
      className={`w-[40%] h-full overflow-y-auto px-10 py-20 flex flex-col justify-start pointer-events-auto`}
    >
      <div className="h-20" />
      {sections.map((section, index) => (
        <div
          key={section.id}
          ref={(el) => { sectionRefs.current[index] = el; }}
          className={`${
            activeSection === index ? "opacity-100" : "opacity-30"
          } min-h-[70vh] flex flex-col justify-center transition-opacity duration-500`}
        >
          <div className="max-w-md ml-auto mr-4 text-stone-800">
            <span className="text-xs uppercase tracking-[0.2em] text-stone-500 font-sans block mb-2">
              Academic Index
            </span>
            <h2 className="text-3xl font-normal mb-4 tracking-tight">
              {section.title}
            </h2>
            <div className="h-1 bg-stone-300 my-6" />
            <p className="leading-relaxed font-sans text-sm text-stone-600">
              {section.description}
            </p>
          </div>
        </div>
      ))}
      <div className="h-20" />
    </div>
  );
}
