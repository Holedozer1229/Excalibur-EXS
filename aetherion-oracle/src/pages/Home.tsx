/**
 * Thin `/` gate — keeps the authenticated Index shell and PublicHome
 * below-fold widgets out of each other's critical path.
 */
import { Suspense, lazy, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const PublicHome = lazy(() => import("@/components/PublicHome"));
const Index = lazy(() => import("./Index"));

function BootFallback() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
    </div>
  );
}

export default function Home() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (session === undefined) return <BootFallback />;

  return (
    <Suspense fallback={<BootFallback />}>
      {session ? <Index /> : <PublicHome hasSession={false} />}
    </Suspense>
  );
}
