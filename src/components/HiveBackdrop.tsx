/**
 * Decorative honeycomb hive edges: thin metallic gold hexagon outlines along
 * the left and right background edges, fading toward the central content.
 * Purely visual — pointer-events-none and aria-hidden. Cells stay unfilled.
 */
export function HiveBackdrop({ className = "-z-10" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none fixed inset-0 overflow-hidden ${className}`}>
      {(["l", "r"] as const).map((side) => (
        <svg
          key={side}
          className={`absolute top-0 h-full w-[120px] sm:w-[220px] ${side === "l" ? "left-0" : "right-0 -scale-x-100"}`}
          fill="none"
        >
          <defs>
            <pattern id={`hive-${side}`} width="108" height="62.4" patternUnits="userSpaceOnUse">
              <g className="text-primary" stroke="currentColor" strokeWidth="1">
                <path d="M72 31.2L54 62.4L18 62.4L0 31.2L18 0L54 0Z" />
                <path d="M126 0L108 31.2L72 31.2L54 0L72 -31.2L108 -31.2Z" />
                <path d="M126 62.4L108 93.5L72 93.5L54 62.4L72 31.2L108 31.2Z" />
              </g>
            </pattern>
            <linearGradient id={`hive-fade-${side}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="1" />
              <stop offset="0.55" stopColor="#fff" stopOpacity="0.45" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id={`hive-mask-${side}`}>
              <rect width="100%" height="100%" fill={`url(#hive-fade-${side})`} />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill={`url(#hive-${side})`} mask={`url(#hive-mask-${side})`} opacity="0.35" />
        </svg>
      ))}
    </div>
  );
}
