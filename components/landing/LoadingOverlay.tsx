import { useProgress } from "@react-three/drei";

interface LoadingOverlayProps {
  isLoaded: boolean;
}

export default function LoadingOverlay({ isLoaded }: LoadingOverlayProps) {
  const { progress } = useProgress();
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface transition-all duration-500 ease-in-out ${
        isLoaded ? "opacity-0 pointer-events-none scale-105" : "opacity-100 scale-100"
      }`}
    >
      <div className="text-xs tracking-[0.3em] text-text-secondary font-serif mb-4">PREPARING EXPERIENCE</div>
      <div className="w-48 h-1 bg-slate-200 overflow-hidden relative">
        <div className="absolute top-0 left-0 h-full bg-brand transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}