// Exit-intent / dwell-trigger email capture for /lp.
// Triggered by either:
//   - mouse leaving the viewport from the top (desktop exit-intent), or
//   - 30s of dwell on /lp with no cast started (mobile fallback).
// Fires once per session; respects a sessionStorage "dismissed" flag.

import { useEffect, useState } from "react";
import { Sparkles, Loader2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getUtm, getSessionId, trackEvent } from "@/lib/funnel";

const DISMISS_KEY = "ae_lp_exit_dismissed";

interface Props {
  /** Set to true once the user starts a cast — modal stops trying to fire. */
  castStarted: boolean;
}

export function ExitIntentModal({ castStarted }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [err, setErr] = useState("");

  useEffect(() => {
    let dismissed = false;
    try { dismissed = sessionStorage.getItem(DISMISS_KEY) === "1"; } catch { /* noop */ }
    if (dismissed) return;

    let fired = false;
    const fire = () => {
      if (fired || castStarted) return;
      fired = true;
      void trackEvent("waitlist_modal_shown");
      setOpen(true);
    };

    // Desktop exit-intent: cursor leaves the viewport from the top.
    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget) fire();
    };
    document.addEventListener("mouseout", onMouseOut);

    // Mobile / fallback: 30s dwell.
    const dwell = window.setTimeout(fire, 30_000);

    return () => {
      document.removeEventListener("mouseout", onMouseOut);
      window.clearTimeout(dwell);
    };
  }, [castStarted]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setErr("");
    try {
      const utm = getUtm();
      const { data, error } = await supabase.functions.invoke("waitlist-signup", {
        body: {
          email,
          source: "lp_exit_modal",
          session_id: getSessionId(),
          user_agent: navigator.userAgent.slice(0, 280),
          ...utm,
        },
      });
      if (error || (data && (data as { error?: string }).error)) {
        throw new Error((data as { error?: string })?.error ?? error?.message ?? "submit_failed");
      }
      setState("ok");
      void trackEvent("waitlist_submitted", { source: "lp_exit_modal" });
      try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* noop */ }
      setTimeout(() => setOpen(false), 1800);
    } catch (e) {
      setState("err");
      setErr((e as Error).message || "Something went wrong.");
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* noop */ }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-violet-500/30 bg-background/95 backdrop-blur sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2 text-violet-300">
            <Sparkles className="h-4 w-4" />
            <span className="font-saga text-xs uppercase tracking-[0.2em]">Before you go</span>
          </div>
          <DialogTitle className="font-saga text-2xl">A fresh sealed reading, every morning.</DialogTitle>
          <DialogDescription className="pt-1">
            One wallet-bound, sha-256-sealed tarot pull in your inbox at dawn. Verifiable. Free. No replays.
          </DialogDescription>
        </DialogHeader>

        {state === "ok" ? (
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300">
            <Check className="h-4 w-4" /> You're in. The first seal arrives tomorrow.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Input
              type="email"
              required
              autoFocus
              placeholder="you@somewhere.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background/60"
              disabled={state === "sending"}
            />
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button type="submit" disabled={state === "sending"} className="w-full">
              {state === "sending" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Send me the dawn seal
            </Button>
            <p className="text-center text-[10px] uppercase tracking-wider text-muted-foreground">
              No spam. Unsubscribe with one click.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
