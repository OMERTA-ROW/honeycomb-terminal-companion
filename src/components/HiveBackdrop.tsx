import { useId } from "react";

/** Decorative outline-only metallic hive edges; cell interiors stay empty. */
export function HiveBackdrop({ className = "-z-10" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <div aria-hidden="true" className={`hive-backdrop pointer-events-none fixed inset-0 overflow-hidden ${className}`}>
      {(["l", "r"] as const).map((side) => {
        const prefix = `${id}-${side}`;
        return (
          <svg key={side} className={`hive-edge absolute top-0 h-full ${side === "l" ? "left-0" : "right-0 -scale-x-100"}`} fill="none">
            <defs>
              <linearGradient id={`${prefix}-metal`} x1="0" y1="0" x2="104" y2="135" gradientUnits="userSpaceOnUse">
                <stop offset="0" className="hive-metal-highlight" />
                <stop offset="0.22" className="hive-metal-gold" />
                <stop offset="0.48" className="hive-metal-shadow" />
                <stop offset="0.66" className="hive-metal-highlight" />
                <stop offset="0.82" className="hive-metal-gold" />
                <stop offset="1" className="hive-metal-shadow" />
              </linearGradient>
              <path id={`${prefix}-cells`} d="M104 45L78 90L26 90L0 45L26 0L78 0Z M182 0L156 45L104 45L78 0L104 -45L156 -45Z M182 90L156 135L104 135L78 90L104 45L156 45Z" />
              <pattern id={`${prefix}-hive`} width="156" height="90" patternUnits="userSpaceOnUse">
                <use href={`#${prefix}-cells`} className="hive-outline-glow" strokeWidth="5" />
                <use href={`#${prefix}-cells`} className="hive-outline-depth" strokeWidth="3" />
                <use href={`#${prefix}-cells`} stroke={`url(#${prefix}-metal)`} strokeWidth="1.4" />
                <use href={`#${prefix}-cells`} className="hive-outline-highlight" strokeWidth="0.45" transform="translate(0 -0.8)" />
              </pattern>
              <linearGradient id={`${prefix}-fade`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" className="hive-mask" stopOpacity="0.95" />
                <stop offset="0.35" className="hive-mask" stopOpacity="0.75" />
                <stop offset="0.7" className="hive-mask" stopOpacity="0.22" />
                <stop offset="1" className="hive-mask" stopOpacity="0" />
              </linearGradient>
              <mask id={`${prefix}-mask`}>
                <rect width="100%" height="100%" fill={`url(#${prefix}-fade)`} />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${prefix}-hive)`} mask={`url(#${prefix}-mask)`} />
          </svg>
        );
      })}
    </div>
  );
}
