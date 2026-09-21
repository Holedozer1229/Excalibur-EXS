import { POWERED_BY_UI3 } from "@/lib/brand";

type Props = {
  className?: string;
  /** Show full "Powered by …" line; false shows name only. */
  showPoweredBy?: boolean;
};

export default function PoweredByUI3({ className = "", showPoweredBy = true }: Props) {
  return (
    <p
      className={`font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground/80 ${className}`}
      data-testid="powered-by-ui3"
    >
      {showPoweredBy ? POWERED_BY_UI3 : "Universal Intelligence III"}
    </p>
  );
}
