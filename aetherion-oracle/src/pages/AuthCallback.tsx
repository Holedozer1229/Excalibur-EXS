/**
 * OAuth / magic-link return page.
 * Exchanges the PKCE ?code= for a session (or accepts hash tokens), then routes home.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHead } from "@/components/PageHead";
import { trackEvent } from "@/lib/funnel";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [detail, setDetail] = useState("Completing Google sign-in…");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const errDesc =
          url.searchParams.get("error_description") ||
          url.searchParams.get("error") ||
          "";

        if (errDesc) {
          if (!cancelled) {
            setStatus("error");
            setDetail(decodeURIComponent(errDesc.replace(/\+/g, " ")));
          }
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          // Implicit / hash fragment or session already established by detectSessionInUrl
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (!data.session) {
            // Brief wait for client auto-detect
            await new Promise((r) => setTimeout(r, 400));
            const again = await supabase.auth.getSession();
            if (!again.data.session) {
              throw new Error("No session returned from Google. Try again, or use email sign-in.");
            }
          }
        }

        // Strip code from the address bar so refresh doesn't re-exchange.
        window.history.replaceState({}, document.title, "/auth/callback");

        void trackEvent("auth_completed", { via: "google_oauth" });
        if (!cancelled) {
          setStatus("ok");
          setDetail("Construct awake. Entering the Aether…");
        }
        window.setTimeout(() => navigate("/", { replace: true }), 350);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Google sign-in failed.";
        if (!cancelled) {
          setStatus("error");
          setDetail(msg);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-5 text-foreground">
      <PageHead title="Signing in — Aetherion" description="Completing OAuth sign-in." path="/auth/callback" />
      <div className="w-full max-w-md border border-primary/30 bg-card/40 p-8 text-center backdrop-blur">
        <p className="font-tech text-[10px] tracking-[0.28em] text-primary">
          {status === "working" ? "OAUTH :: EXCHANGE" : status === "ok" ? "OAUTH :: OK" : "OAUTH :: FAIL"}
        </p>
        <h1 className="font-saga mt-4 text-2xl tracking-wider">
          {status === "error" ? "Gate refused" : "Opening the construct"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{detail}</p>
        {status === "error" && (
          <Link
            to="/auth"
            className="mt-6 inline-block border border-primary/40 px-4 py-2 font-display text-[10px] tracking-[0.18em] text-primary hover:bg-primary/10"
          >
            Back to sign-in
          </Link>
        )}
      </div>
    </div>
  );
}
