// Branded logo — crystalline unicorn + variant wordmark.
// Primary: AETHERION · AQAI for chipset contexts · AetherOS alias.

import { cn } from "@/lib/utils";

export type AetherionLogoVariant = "aetherion" | "aqai" | "aetheros";

const VARIANTS: Record<
  AetherionLogoVariant,
  { src: string; alt: string; title: string; subtitle: string }
> = {
  aetherion: {
    src: "/brand/aetherion-logo.webp",
    alt: "Aetherion — Quantum AI · Caduceus",
    title: "AETHERION",
    subtitle: "QUANTUM AI · CADUCEUS",
  },
  aqai: {
    src: "/brand/aqai-logo.webp",
    alt: "AQAI — Verified Cognition silicon",
    title: "AQAI",
    subtitle: "VERIFIED COGNITION",
  },
  aetheros: {
    src: "/brand/aetherion-logo.webp",
    alt: "AetherOS — Quantum AI stack",
    title: "AetherOS",
    subtitle: "QUANTUM AI · CADUCEUS",
  },
};

const SIZE_PX: Record<"sm" | "md" | "lg" | "xl", number> = {
  sm: 48,
  md: 96,
  lg: 176,
  xl: 208,
};

type Props = {
  variant?: AetherionLogoVariant;
  size?: keyof typeof SIZE_PX | number;
  className?: string;
  /** Show CSS wordmark overlay on source art (fallback when baked text is wrong). */
  overlayText?: boolean;
  showSubtitle?: boolean;
  halo?: boolean;
  priority?: boolean;
  "data-testid"?: string;
};

export function AetherionLogo({
  variant = "aetherion",
  size = "md",
  className,
  overlayText = false,
  showSubtitle = false,
  halo = false,
  priority = false,
  "data-testid": testId = "aetherion-logo",
}: Props) {
  const meta = VARIANTS[variant];
  const px = typeof size === "number" ? size : SIZE_PX[size];
  const imgSrc = overlayText ? "/brand/aetherion-logo-source.jpg" : meta.src;

  return (
    <div
      className={cn("relative inline-flex flex-col items-center", className)}
      data-testid={testId}
      data-variant={variant}
      style={{ width: px, maxWidth: "100%" }}
    >
      {halo && (
        <div
          aria-hidden
          className="logo-halo absolute inset-0 blur-xl animate-pulse-glow"
        />
      )}
      <img
        src={imgSrc}
        alt={meta.alt}
        width={px}
        height={px}
        fetchPriority={priority ? "high" : undefined}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={cn(
          "relative h-auto w-full object-contain",
          overlayText && "object-[center_38%] object-cover rounded-sm",
          halo && "drop-shadow-[0_0_28px_hsl(186_100%_55%/0.65)]",
        )}
        style={overlayText ? { aspectRatio: "1", clipPath: "inset(0 0 22% 0)" } : undefined}
      />
      {overlayText && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center pb-[4%] text-center"
          aria-hidden
        >
          <span
            className="font-display text-[clamp(0.55rem,18%,1.1rem)] font-bold uppercase tracking-[0.12em] text-foreground/95"
            style={{
              textShadow:
                "0 0 12px hsl(186 100% 55% / 0.5), 0 1px 0 hsl(0 0% 100% / 0.35)",
            }}
          >
            {meta.title}
          </span>
          {showSubtitle && (
            <span className="mt-0.5 font-mono text-[clamp(0.35rem,10%,0.55rem)] uppercase tracking-[0.28em] text-primary/80">
              {meta.subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default AetherionLogo;
