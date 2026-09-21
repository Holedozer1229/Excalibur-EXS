import { useEffect, useState } from "react";
import { AlertTriangle, Server, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Status {
  configured: boolean;
  model?: string;
  host?: string;
  message?: string;
}

/**
 * SelfContainedLlmBanner
 * ------------------------------------------------------------------
 * Aetherion runs fully self-contained: every LLM call routes to an
 * admin-configured, self-hosted OpenAI-compatible endpoint (Ollama,
 * llama.cpp, vLLM, LM Studio). When nothing is configured we surface
 * a calm but visible banner so admins know to point the app at their
 * local model. Non-admins simply see a "we're tending the oracle"
 * notice instead of a confusing AI error.
 */
export default function SelfContainedLlmBanner({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke<Status>("llm-status");
        if (alive && data) setStatus(data);
      } catch {
        if (alive) setStatus({ configured: false, message: "Status unavailable." });
      }
    })();
    return () => { alive = false; };
  }, []);

  if (!status || status.configured || dismissed) return null;

  return (
    <div className={`relative border border-amber-400/40 bg-amber-500/10 text-amber-100 rounded-lg ${compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold flex items-center gap-2">
            <Server className="w-3.5 h-3.5" /> Local LLM not configured
          </div>
          <p className="opacity-90 mt-1">
            Aetherion is self-contained and won't call any outside AI service.
            An admin needs to point it at a local model (Ollama, llama.cpp,
            vLLM, LM Studio…) before oracle, dream, and chat features can run.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              to="/admin/settings"
              className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-amber-50"
            >
              Configure local LLM <ExternalLink className="w-3 h-3" />
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className="opacity-70 hover:opacity-100 underline-offset-2 hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
