'use client';
import { ACT2SUBSTEPS } from './Act2Narrative';

export default function Act2NarrativeMd({ step }: { step: number }) {
  return (
    <div className="flex flex-col items-start w-full pt-2">
      <h2 className="text-lg font-semibold text-slate-800 mb-3">
        Act 2: The Strips
      </h2>
      {ACT2SUBSTEPS.filter((s) => s.step === step).map((s) => (
        <div
          key={s.step}
          className="text-sm leading-relaxed text-slate-700"
        >
          {s.text}
        </div>
      ))}
    </div>
  );
}
