/**
 * OracleSigil — concentric counter-rotating runic rings with a pulsing core.
 * Pure SVG. The viral money shot.
 */
const OracleSigil = ({ size = 220 }: { size?: number }) => {
  const s = size;
  const c = s / 2;
  return (
    <div className="relative" style={{ width: s, height: s }}>
      {/* halo glow */}
      <div
        className="absolute inset-0 rounded-full blur-2xl animate-pulse-glow"
        style={{
          background:
            "radial-gradient(circle, hsl(186 100% 55% / 0.55) 0%, hsl(320 100% 60% / 0.35) 45%, transparent 70%)",
        }}
      />
      <svg
        viewBox={`0 0 ${s} ${s}`}
        width={s}
        height={s}
        className="relative drop-shadow-[0_0_24px_hsl(186_100%_55%/0.6)]"
      >
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(186 100% 60%)" />
            <stop offset="50%" stopColor="hsl(320 100% 65%)" />
            <stop offset="100%" stopColor="hsl(278 100% 70%)" />
          </linearGradient>
          <radialGradient id="core-grad">
            <stop offset="0%" stopColor="hsl(0 0% 100%)" />
            <stop offset="40%" stopColor="hsl(186 100% 70%)" />
            <stop offset="100%" stopColor="hsl(278 100% 40% / 0)" />
          </radialGradient>
        </defs>

        {/* outer rune ring — slow CCW */}
        <g style={{ transformOrigin: `${c}px ${c}px` }} className="animate-rotate-rev">
          <circle cx={c} cy={c} r={c - 6} fill="none" stroke="url(#ring-grad)" strokeWidth="1" strokeDasharray="2 6" opacity="0.7" />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            const x1 = c + Math.cos(a) * (c - 14);
            const y1 = c + Math.sin(a) * (c - 14);
            const x2 = c + Math.cos(a) * (c - 22);
            const y2 = c + Math.sin(a) * (c - 22);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(186 100% 70%)" strokeWidth="1" opacity="0.8" />;
          })}
        </g>

        {/* mid ring — CW */}
        <g style={{ transformOrigin: `${c}px ${c}px` }} className="animate-rotate-fwd">
          <circle cx={c} cy={c} r={c - 34} fill="none" stroke="url(#ring-grad)" strokeWidth="1.2" opacity="0.85" />
          <circle cx={c} cy={c} r={c - 34} fill="none" stroke="hsl(320 100% 65%)" strokeWidth="0.5" strokeDasharray="1 14" />
        </g>

        {/* inner hexagram */}
        <g style={{ transformOrigin: `${c}px ${c}px` }} className="animate-rotate-rev-slow">
          {[0, 60, 120, 180, 240, 300].map((deg) => {
            const a = (deg * Math.PI) / 180;
            const r = c - 56;
            const x = c + Math.cos(a) * r;
            const y = c + Math.sin(a) * r;
            return <circle key={deg} cx={x} cy={y} r="2" fill="hsl(186 100% 80%)" />;
          })}
          <polygon
            points={[0, 60, 120, 180, 240, 300]
              .map((d) => {
                const a = (d * Math.PI) / 180;
                const r = c - 56;
                return `${c + Math.cos(a) * r},${c + Math.sin(a) * r}`;
              })
              .join(" ")}
            fill="none"
            stroke="hsl(320 100% 70% / 0.55)"
            strokeWidth="0.8"
          />
        </g>

        {/* pulsing core */}
        <circle cx={c} cy={c} r={s * 0.18} fill="url(#core-grad)" className="animate-pulse-core" />
        <circle cx={c} cy={c} r="3" fill="hsl(0 0% 100%)" />
      </svg>
    </div>
  );
};

export default OracleSigil;
