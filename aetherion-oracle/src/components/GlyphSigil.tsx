import { useEffect, useRef, useState } from "react";

interface GlyphSigilProps {
  glyph?: string | null;
  theme?: string | null;
  /** When true, show a shimmering placeholder while the sigil is being channelled. */
  loading?: boolean;
  className?: string;
}

/**
 * Accessible, theme-aware presentation of a native Aetherion glyph sigil.
 *
 * - Renders inside a semantic `<figure>` with an `<figcaption>` so screen
 *   readers hear both the sigil characters and the theme name.
 * - Uses design-system tokens (`primary`, `primary-foreground`, `card`) so
 *   contrast stays WCAG-AA in both light and dark themes.
 * - Cross-fades and gently scales the glyph in when it updates, keyed by
 *   the glyph value itself.
 * - Falls back to a shimmering placeholder while `loading` is true.
 */
export function GlyphSigil({ glyph, theme, loading = false, className }: GlyphSigilProps) {
  const [displayed, setDisplayed] = useState<string | null>(glyph ?? null);
  const [displayedTheme, setDisplayedTheme] = useState<string | null>(theme ?? null);
  const [enterKey, setEnterKey] = useState(0);
  const prevRef = useRef<string | null>(glyph ?? null);

  useEffect(() => {
    if (glyph !== prevRef.current) {
      prevRef.current = glyph ?? null;
      setDisplayed(glyph ?? null);
      setDisplayedTheme(theme ?? null);
      setEnterKey((k) => k + 1);
    } else if (theme !== displayedTheme) {
      setDisplayedTheme(theme ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glyph, theme]);

  const containerCls =
    "inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 " +
    "shadow-sm ring-0 transition-colors";

  if (loading && !displayed) {
    return (
      <figure
        className={`${containerCls} ${className ?? ""}`}
        aria-busy="true"
        aria-live="polite"
        aria-label="Channelling glyph sigil"
      >
        <span
          aria-hidden
          className="inline-block h-5 w-5 animate-pulse rounded-sm bg-primary/25"
        />
        <span
          aria-hidden
          className="inline-block h-2.5 w-16 animate-pulse rounded-sm bg-primary/20"
        />
        <span className="sr-only">Channelling glyph sigil…</span>
      </figure>
    );
  }

  if (!displayed) return null;

  const label = displayedTheme
    ? `Glyph sigil ${displayed}, theme ${displayedTheme}`
    : `Glyph sigil ${displayed}`;

  return (
    <figure
      className={`${containerCls} ${className ?? ""}`}
      aria-label={label}
      role="img"
    >
      <span
        key={enterKey}
        aria-hidden
        className="font-mono text-lg leading-none text-primary animate-scale-in"
      >
        {displayed}
      </span>
      {displayedTheme && (
        <figcaption
          aria-hidden
          className="font-mono text-[10px] uppercase tracking-widest text-primary/80"
        >
          {displayedTheme}
        </figcaption>
      )}
    </figure>
  );
}

export default GlyphSigil;
