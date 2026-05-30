"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";

interface Act0NarrativeProps {};

export function Act0Narrative({}: Act0NarrativeProps) {
    return (
        <>
            <h1 className="text-3xl font-bold mb-4">Prologue: The Journey Begins</h1>
            <p className="text-lg mb-6">
                From the first line of code to the final thesis, this visualization chronicles my five-year journey through undergraduate research. Each act unveils a chapter of growth, challenges, and triumphs, inviting you to explore the evolution of my academic footprint.
            </p>
        </>
    );
}

interface Act0VisualProps {};

export function Act0Visual({}: Act0VisualProps) {
    return (
        <>
            <h1 className="text-2xl font-bold mb-4">Act 0: Overview</h1>
        </>
    );
}