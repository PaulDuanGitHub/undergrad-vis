"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";

interface Act1NarrativeProps {};

export function Act1Narrative({}: Act1NarrativeProps) {
    return (
        <>
            <h1 className="text-4xl font-bold mb-4">Act 1: The Volume</h1>
            <p className="text-lg mb-6">
                Five years of academic footprint, distilled into a single heatmap. This visualization captures the ebb and flow of my research output, revealing patterns of productivity, collaboration, and growth across semesters. Each cell tells a story of dedication, discovery, and the relentless pursuit of knowledge.
            </p>
        </>
    );
}

interface Act1VisualProps {};

export function Act1Visual({}: Act1VisualProps) {
    return (
        <>
            <h1 className="text-2xl font-bold mb-4">Act 1: Heatmap</h1>
        </>
    );
}