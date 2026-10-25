import { useEffect, useRef, useState } from "react";
import { BEE_COUNT, beesForProgress } from "@/lib/device-care";

// Mechanical bees filling a honeycomb while the app locks.
// Purely decorative; honors prefers-reduced-motion and a manual toggle.
export function BeeLock({ locking, reducedMotion, onDone }: { locking: boolean; reducedMotion: boolean; onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!locking) { setProgress(0); return; }
    if (reducedMotion) { setProgress(1); doneRef.current(); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1600);
      setProgress(p);
      if (p >= 1) { doneRef.current(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [locking, reducedMotion]);

  const bees = beesForProgress(progress, reducedMotion);

  return (
    <div aria-hidden="true" className="relative grid grid-cols-4 gap-1.5 w-40 mx-auto my-4">
      {Array.from({ length: BEE_COUNT }, (_, i) => (
        <span
          key={i}
          className={`hex-badge aspect-square w-full transition-colors duration-200 ${i < bees ? "bg-primary" : "bg-secondary"}`}
        />
      ))}
    </div>
  );
}
