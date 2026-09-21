import { AETHERION_X_SPHINX, SPHINX_OS, SPHINX_OS_TAGLINE } from "@/lib/brand";

type Props = {
  className?: string;
  compact?: boolean;
};

/** SphinxOS brand mark for bridge / lattice surfaces. */
export default function SphinxOSMark({ className = "", compact = false }: Props) {
  return (
    <div className={`flex flex-col gap-1 ${className}`} data-testid="sphinxos-mark">
      <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-accent">
        {AETHERION_X_SPHINX}
      </p>
      {!compact && (
        <p className="font-display text-xs uppercase tracking-[0.28em] text-muted-foreground">
          {SPHINX_OS} · {SPHINX_OS_TAGLINE}
        </p>
      )}
    </div>
  );
}
