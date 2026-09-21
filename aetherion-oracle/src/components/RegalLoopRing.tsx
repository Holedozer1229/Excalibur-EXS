import { COURT, LOOP_HOURS } from "@/lib/quantumTimeLoop";

type Props = {
  probs: number[];
  tick: number;
  fidelity: number;
  phase: number;
  sovereignHour: number;
};

export default function RegalLoopRing({ probs, tick, fidelity, phase, sovereignHour }: Props) {
  const cx = 160;
  const cy = 160;
  const r = 118;
  const hole = 52;

  return (
    <svg
      viewBox="0 0 320 320"
      className="mx-auto w-full max-w-md"
      role="img"
      aria-label={`Regal loop-hole at hour ${tick} of ${LOOP_HOURS}. Fidelity ${fidelity.toFixed(4)}.`}
    >
      <defs>
        <radialGradient id="crown-gold" cx="50%" cy="45%">
          <stop offset="0%" stopColor="rgba(252, 211, 77, 0.35)" />
          <stop offset="55%" stopColor="rgba(161, 98, 7, 0.2)" />
          <stop offset="100%" stopColor="rgba(24, 16, 8, 0.9)" />
        </radialGradient>
        <filter id="crown-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx={cx} cy={cy} r={r + 18} fill="url(#crown-gold)" stroke="rgba(252,211,77,0.35)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(252,211,77,0.7)" strokeWidth="3" filter="url(#crown-glow)" />
      <circle cx={cx} cy={cy} r={hole} fill="rgba(8, 6, 12, 0.92)" stroke="rgba(252,211,77,0.45)" strokeWidth="2" />

      {probs.map((p, i) => {
        const ang = (i / LOOP_HOURS) * 2 * Math.PI - Math.PI / 2;
        const inner = r - 8;
        const outer = inner + 18 + p * 70;
        const x1 = cx + inner * Math.cos(ang);
        const y1 = cy + inner * Math.sin(ang);
        const x2 = cx + outer * Math.cos(ang);
        const y2 = cy + outer * Math.sin(ang);
        const active = i === tick % LOOP_HOURS;
        const throne = i === sovereignHour;
        return (
          <g key={i}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={throne ? "rgb(252, 211, 77)" : active ? "rgb(196, 181, 253)" : "rgba(252,211,77,0.45)"}
              strokeWidth={throne ? 4 : 2}
              strokeLinecap="round"
            />
            <circle
              cx={cx + (r + 28) * Math.cos(ang)}
              cy={cy + (r + 28) * Math.sin(ang)}
              r={throne ? 5 : 3}
              fill={active ? "rgb(253, 230, 138)" : "rgba(252,211,77,0.5)"}
            />
            <text
              x={cx + (r + 42) * Math.cos(ang)}
              y={cy + (r + 42) * Math.sin(ang)}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-amber-200/80"
              fontSize="7"
              fontFamily="ui-monospace, monospace"
            >
              {i === 0 ? "XII" : i}
            </text>
          </g>
        );
      })}

      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        className="fill-amber-100"
        fontSize="11"
        fontFamily="ui-monospace, monospace"
        letterSpacing="0.2em"
      >
        LOOP-HOLE
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        className="fill-amber-200/90"
        fontSize="9"
        fontFamily="ui-monospace, monospace"
      >
        F {fidelity.toFixed(4)}
      </text>
      <text
        x={cx}
        y={cy + 24}
        textAnchor="middle"
        className="fill-violet-200/80"
        fontSize="8"
        fontFamily="ui-monospace, monospace"
      >
        {(phase * 180) / Math.PI >= 0 ? "+" : ""}
        {((phase * 180) / Math.PI).toFixed(1)}°
      </text>
      <title>{COURT[sovereignHour]?.name}</title>
    </svg>
  );
}
