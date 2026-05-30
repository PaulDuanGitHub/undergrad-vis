"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";

interface Act4NarrativeProps {};

export function Act4Narrative({}: Act4NarrativeProps) {
    return (
        <>
            <h1 className="text-4xl font-bold mb-4">Act 4: The Synthesis</h1>
            <p className="text-lg mb-6">
                The synthesis of insights, the radial convergence of research themes. This act culminates in a radial visualization that synthesizes the key themes, methodologies, and findings from my academic journey. Each spoke represents a thread of inquiry, weaving together the diverse strands of my research into a cohesive narrative of growth and discovery.    
            </p>
        </>
    );
}

interface Act4VisualProps {};

export function Act4Visual({}: Act4VisualProps) {
    return (
        <>
            <h1 className="text-2xl font-bold mb-4">Act 4: Radial</h1>
        </>
    );
}