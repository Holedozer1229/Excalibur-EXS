import { useEffect } from "react";
import { captureUtmFromUrl, trackEvent, type FunnelEvent } from "@/lib/funnel";

/**
 * Capture UTM/ref on first paint and (optionally) fire a page-view event.
 * Use in any page that should be attributable in the funnel — at minimum
 * the landing page (/lp) and any conversion surface (/tarot, /auth).
 */
export function useUtm(pageEvent?: FunnelEvent, metadata?: Record<string, unknown>) {
  useEffect(() => {
    captureUtmFromUrl();
    if (pageEvent) void trackEvent(pageEvent, metadata ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
