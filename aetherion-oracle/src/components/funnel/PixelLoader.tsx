import { useEffect } from "react";
import { initPixels } from "@/lib/pixels";

/**
 * Mounts pixel scripts (Meta + Google) once. Drop into routes that should
 * load pixels — currently /lp, /tarot, /auth. No-op when no IDs configured.
 */
export default function PixelLoader() {
  useEffect(() => { initPixels(); }, []);
  return null;
}
