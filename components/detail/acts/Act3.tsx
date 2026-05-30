"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";

interface Act3NarrativeProps {};

export function Act3Narrative({}: Act3NarrativeProps) {
    return (
        <>
            <h1 className="text-4xl font-bold mb-4">Act 3: The Grind</h1>
            <p className="text-lg mb-6">
                The 12-hour panic vs the 2-week thesis, the grind of research. This act delves into the intense periods of productivity and pressure that punctuated my academic journey. Through a beeswarm plot, we explore the distribution of work hours, deadlines, and the relentless pursuit of excellence that defined my research process.
            </p>
        </>
    );
}

interface Act3VisualProps {};

export function Act3Visual({}: Act3VisualProps) {
    return (
        <>
            <h1 className="text-2xl font-bold mb-4">Act 3: Beeswarm</h1>
        </>
    );
}