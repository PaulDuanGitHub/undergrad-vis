"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";

interface Act2NarrativeProps {};

export function Act2Narrative({}: Act2NarrativeProps) {
    return (
        <>
            <h1 className="text-3xl font-bold mb-4">Act 2: The Arsenal</h1>
            <p className="text-lg mb-6">
                The shift from .docx to .tex, the arsenal of tools amassed over five years of research. This act unveils the evolution of my academic workflow, showcasing the diverse array of software, platforms, and methodologies that have shaped my scholarly output. From reference managers to data analysis tools, each element in this visualization represents a crucial component of my research arsenal.
            </p>
        </>
    );
}

interface Act2VisualProps {};

export function Act2Visual({}: Act2VisualProps) {
    return (
        <>
            <h1 className="text-2xl font-bold mb-4">Act 2: Streamgraph</h1>
        </>
    );
}