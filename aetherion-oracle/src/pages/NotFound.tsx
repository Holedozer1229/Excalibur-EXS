import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div>
        <div className="font-tech mb-3 text-[11px] tracking-widest text-[hsl(var(--neon-cyan))]">
          &gt; SIGNAL_LOST.exe
        </div>
        <h1 className="font-saga neon-block text-6xl sm:text-7xl">404</h1>
        <p className="mt-4 font-crt text-xl text-foreground/80">
          this rite has no glyph
        </p>
        <Link
          to="/"
          className="font-tech mt-8 inline-block rounded-sm border border-[hsl(186_100%_70%/0.3)] bg-[hsl(260_40%_5%/0.7)] px-5 py-2.5 text-xs uppercase tracking-widest text-[hsl(var(--neon-cyan))] transition-all hover:border-[hsl(var(--neon-magenta))] hover:text-[hsl(var(--neon-magenta))] hover:shadow-[0_0_30px_hsl(320_100%_60%/0.4)]"
        >
          &lt; return to the aether
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
