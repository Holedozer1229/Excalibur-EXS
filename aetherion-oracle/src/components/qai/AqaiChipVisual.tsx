/** Procedural AQAI chip SVG — zero network, pairs with /public/chipset/*.png art. */
import { cn } from "@/lib/utils";

type Variant = "hero" | "edge" | "cloud" | "mini";

const VARIANT_GLOW: Record<Variant, { primary: string; accent: string }> = {
  hero: { primary: "rgba(62,207,207,0.85)", accent: "rgba(240,180,41,0.9)" },
  edge: { primary: "rgba(62,207,207,0.75)", accent: "rgba(240,180,41,0.7)" },
  cloud: { primary: "rgba(147,112,219,0.8)", accent: "rgba(62,207,207,0.85)" },
  mini: { primary: "rgba(62,207,207,0.6)", accent: "rgba(240,180,41,0.55)" },
};

export function AqaiChipVisual({
  variant = "hero",
  className,
  imageSrc,
  alt = "AETHERION QAI chipset",
}: {
  variant?: Variant;
  className?: string;
  imageSrc?: string;
  alt?: string;
}) {
  const glow = VARIANT_GLOW[variant];
  const id = `aqai-${variant}`;

  return (
    <div className={cn("relative aspect-square w-full max-w-md", className)}>
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={alt}
          className="absolute inset-0 h-full w-full rounded-sm object-cover shadow-[0_0_60px_rgba(62,207,207,0.25)]"
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <svg
        viewBox="0 0 400 400"
        className={cn(
          "relative z-10 h-full w-full drop-shadow-[0_0_24px_rgba(62,207,207,0.35)]",
          imageSrc && "mix-blend-screen opacity-90",
        )}
        aria-hidden={!!imageSrc}
        role={imageSrc ? undefined : "img"}
      >
        <defs>
          <linearGradient id={`${id}-die`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a0e18" />
            <stop offset="50%" stopColor="#121a28" />
            <stop offset="100%" stopColor="#0d1119" />
          </linearGradient>
          <radialGradient id={`${id}-core`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={glow.accent} stopOpacity="0.35" />
            <stop offset="100%" stopColor={glow.primary} stopOpacity="0" />
          </radialGradient>
          <filter id={`${id}-glow`}>
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Package frame */}
        <rect x="40" y="40" width="320" height="320" rx="8" fill="#1a1f2e" stroke="#2a3548" strokeWidth="2" />
        <rect x="52" y="52" width="296" height="296" rx="4" fill={`url(#${id}-die)`} stroke={glow.primary} strokeWidth="1" strokeOpacity="0.4" />

        {/* Skin edge tiles — axiom 3 */}
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={`skin-${i}`}
            x={52 + (i % 2) * 268}
            y={52 + Math.floor(i / 2) * 268}
            width={28}
            height={28}
            fill={glow.accent}
            fillOpacity={0.15 + i * 0.08}
            stroke={glow.accent}
            strokeWidth="0.5"
            strokeOpacity="0.6"
          />
        ))}

        {/* CORE-Ω glow */}
        <circle cx="200" cy="200" r="90" fill={`url(#${id}-core)`} />

        {/* Twin serpent braid — Caduceus */}
        <path
          d="M 120 200 Q 160 120 200 200 Q 240 280 280 200"
          fill="none"
          stroke={glow.primary}
          strokeWidth="2.5"
          filter={`url(#${id}-glow)`}
          opacity="0.9"
        />
        <path
          d="M 120 200 Q 160 280 200 200 Q 240 120 280 200"
          fill="none"
          stroke={glow.accent}
          strokeWidth="2.5"
          filter={`url(#${id}-glow)`}
          opacity="0.85"
        />

        {/* EP nodes — axiom 4 */}
        {[
          [140, 140],
          [260, 140],
          [260, 260],
          [140, 260],
        ].map(([x, y], i) => (
          <circle key={`ep-${i}`} cx={x} cy={y} r="6" fill={glow.primary} fillOpacity="0.5" stroke={glow.accent} strokeWidth="1" />
        ))}

        {/* Seal IOC ring — axiom 1 */}
        <circle cx="200" cy="200" r="118" fill="none" stroke={glow.primary} strokeWidth="1" strokeDasharray="4 6" opacity="0.5" />

        {/* NPU grid stub */}
        {Array.from({ length: 5 }, (_, r) =>
          Array.from({ length: 5 }, (_, c) => (
            <rect
              key={`npu-${r}-${c}`}
              x={158 + c * 16}
              y={158 + r * 16}
              width="10"
              height="10"
              fill={glow.primary}
              fillOpacity={0.08 + ((r + c) % 3) * 0.04}
              rx="1"
            />
          )),
        )}

        {/* Pins */}
        {Array.from({ length: 12 }, (_, i) => (
          <rect
            key={`pin-t-${i}`}
            x={60 + i * 24}
            y="28"
            width="8"
            height="14"
            fill="#c9a227"
            fillOpacity="0.7"
            rx="1"
          />
        ))}
      </svg>
    </div>
  );
}
