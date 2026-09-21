import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";

type SettingRow = { key: string; value: unknown; updated_at: string };

type FieldDef = {
  key: string;
  label: string;
  description: string;
  kind: "text" | "textarea" | "number";
  placeholder?: string;
  secret?: boolean;
};

const FIELDS: FieldDef[] = [
  {
    key: "AI_MODEL",
    label: "AI model",
    description:
      "Lovable AI Gateway model id. Default: google/gemini-3-flash-preview. Try google/gemini-2.5-pro, openai/gpt-5, openai/gpt-5-mini.",
    kind: "text",
    placeholder: "google/gemini-3-flash-preview",
  },
  {
    key: "ORACLE_TEMPERATURE",
    label: "Oracle temperature",
    description: "Sampling temperature (0–2). Higher = more poetic/chaotic.",
    kind: "number",
    placeholder: "0.85",
  },
  {
    key: "ORACLE_MAX_TOKENS",
    label: "Oracle max tokens",
    description: "Maximum tokens per oracle reading.",
    kind: "number",
    placeholder: "1024",
  },
  {
    key: "ORACLE_SYSTEM_EXTRA",
    label: "Oracle system prompt addendum",
    description: "Optional text appended to the oracle system prompt.",
    kind: "textarea",
    placeholder: "Speak with the cadence of a 13th-century mystic…",
  },
  {
    key: "ADMIN_LLM_BASE_URL",
    label: "Custom LLM base URL (optional)",
    description: "If set with model + key, overrides Lovable AI gateway entirely.",
    kind: "text",
    placeholder: "https://api.openai.com/v1",
  },
  {
    key: "ADMIN_LLM_MODEL",
    label: "Custom LLM model (optional)",
    description: "Model id used with the custom base URL above.",
    kind: "text",
    placeholder: "gpt-4o-mini",
  },
  {
    key: "ADMIN_LLM_API_KEY",
    label: "Custom LLM API key (optional)",
    description: "Stored in the database. Use a low-privilege key.",
    kind: "text",
    secret: true,
  },
];

// One-click presets for free / self-hosted / BYO-key LLM providers.
// Selecting one fills the three ADMIN_LLM_* fields; user adds their own key.
type Preset = {
  id: string;
  name: string;
  note: string;
  base_url: string;
  model: string;
  free?: boolean;
};
const PRESETS: Preset[] = [
  {
    id: "aetherion-v4",
    name: "Aetherion v4 (built-in · zero cost)",
    note: "Self-contained hybrid translator engine. No API key, no network calls, no credits. Speaks in glyphs and memorials.",
    base_url: "internal://aetherion-v4",
    model: "aetherion-v4",
    free: true,
  },
  {
    id: "aetherion-oracle-v5",
    name: "Aetherion Oracle v5 (native external)",
    note: "Your self-hosted Python Flask oracle (Deep RNN + Glyph Language). Base URL = your deployment root (e.g. https://aetherion-oracle.co). No API key required unless you added one.",
    base_url: "https://aetherion-oracle.co",
    model: "aetherion-oracle-v5",
    free: true,
  },
  {
    id: "groq",
    name: "Groq (free tier)",
    note: "Fast Llama 3.3 70B. Generous free quota — get a key at console.groq.com.",
    base_url: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    free: true,
  },
  {
    id: "openrouter-free",
    name: "OpenRouter (free models)",
    note: "Rotating free Llama / Gemma / Qwen. Key at openrouter.ai/keys.",
    base_url: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    free: true,
  },
  {
    id: "cerebras",
    name: "Cerebras (free tier)",
    note: "Insanely fast Llama. Key at cloud.cerebras.ai.",
    base_url: "https://api.cerebras.ai/v1",
    model: "llama-3.3-70b",
    free: true,
  },
  {
    id: "google-aistudio",
    name: "Google AI Studio (free)",
    note: "Gemini direct, free quota. Key at aistudio.google.com.",
    base_url: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.0-flash",
    free: true,
  },
  {
    id: "ollama",
    name: "Ollama (self-hosted)",
    note: "Point at your own server, e.g. https://ollama.yourdomain.com/v1. No key needed.",
    base_url: "https://ollama.example.com/v1",
    model: "llama3.1:8b",
  },
  {
    id: "openai",
    name: "OpenAI (paid)",
    note: "Standard OpenAI. Key at platform.openai.com.",
    base_url: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  {
    id: "lovable",
    name: "Lovable AI (default)",
    note: "Clears all three override fields and falls back to Lovable AI credits.",
    base_url: "",
    model: "",
  },
];




function unwrap(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object" && v && "value" in (v as any)) {
    const inner = (v as any).value;
    return inner == null ? "" : String(inner);
  }
  return JSON.stringify(v);
}

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<SettingRow[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | {
    ok: boolean; provider?: string; model?: string; base_url?: string;
    latency_ms?: number; reply?: string; error?: string;
  }>(null);

  async function applyPreset(p: Preset) {
    const updates: Array<[string, string]> = [
      ["ADMIN_LLM_BASE_URL", p.base_url],
      ["ADMIN_LLM_MODEL", p.model],
    ];
    setValues((v) => ({
      ...v,
      ADMIN_LLM_BASE_URL: p.base_url,
      ADMIN_LLM_MODEL: p.model,
    }));
    try {
      for (const [key, raw] of updates) {
        if (raw === "") {
          await supabase.from("app_settings").delete().eq("key", key);
        } else {
          await supabase.from("app_settings").upsert(
            { key, value: { value: raw } }, { onConflict: "key" },
          );
        }
      }
      toast.success(`Applied preset: ${p.name}`, {
        description: p.base_url ? "Now paste your API key below and save." : "Reverted to Lovable AI.",
      });
      await refresh();
    } catch (e: any) {
      toast.error("Preset failed", { description: e?.message ?? String(e) });
    }
  }

  async function runTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("test-llm", { body: {} });
      if (error) throw error;
      setTestResult(data);
      if (data?.ok) {
        toast.success(`LLM OK · ${data.provider} · ${data.latency_ms}ms`);
      } else {
        toast.error("LLM test failed", { description: data?.error });
      }
    } catch (e: any) {
      toast.error("Test failed", { description: e?.message ?? String(e) });
    } finally {
      setTesting(false);
    }
  }

  const byKey = useMemo(() => Object.fromEntries(rows.map((r) => [r.key, r])), [rows]);

  async function refresh() {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key,value,updated_at");
    if (error) {
      toast.error("Failed to load settings", { description: error.message });
      return;
    }
    const list = (data ?? []) as SettingRow[];
    setRows(list);
    const next: Record<string, string> = {};
    for (const f of FIELDS) {
      const row = list.find((r) => r.key === f.key);
      next[f.key] = unwrap(row?.value);
    }
    setValues(next);
  }

  useEffect(() => {
    (async () => {
      const { data: ses } = await supabase.auth.getSession();
      const uid = ses.session?.user.id;
      if (!uid) {
        setLoading(false);
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      const admin = (roles ?? []).some((r: any) => r.role === "admin");
      setIsAdmin(admin);
      if (admin) await refresh();
      setLoading(false);
    })();
  }, []);

  async function save(field: FieldDef) {
    setSaving(field.key);
    const raw = values[field.key]?.trim() ?? "";
    try {
      if (raw === "") {
        await supabase.from("app_settings").delete().eq("key", field.key);
        toast.success(`Cleared ${field.key}`);
      } else {
        const value =
          field.kind === "number" && raw !== "" && !Number.isNaN(Number(raw))
            ? { value: Number(raw) }
            : { value: raw };
        const { error } = await supabase
          .from("app_settings")
          .upsert({ key: field.key, value }, { onConflict: "key" });
        if (error) throw error;
        toast.success(`Saved ${field.key}`);
      }
      await refresh();
    } catch (e: any) {
      toast.error("Save failed", { description: e?.message ?? String(e) });
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Admins only</CardTitle>
            <CardDescription>
              You need the admin role to view or change oracle parameters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/" className="underline">
              Return home
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Oracle Settings</h1>
          <p className="text-muted-foreground text-sm">
            Runtime overrides for AI model and oracle parameters. Saved values take
            effect within ~15s for new requests. Blank a field and save to revert to
            the env default.
          </p>
        </header>

        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-lg">LLM Provider · eliminate AI credit usage</CardTitle>
            <CardDescription>
              Route every oracle, tarot, dream and learn-article call through your own
              free or self-hosted LLM. Pick a preset, paste your key in the field below,
              and hit Test. All Lovable AI credit usage stops the moment a preset is active.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p)}
                  className="text-left border rounded-md p-3 hover:border-primary/60 transition bg-card"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{p.name}</span>
                    {p.free && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                        free
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{p.note}</p>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <div className="text-xs text-muted-foreground">
                Active:{" "}
                <span className="font-mono">
                  {values.ADMIN_LLM_BASE_URL
                    ? `${values.ADMIN_LLM_MODEL || "(no model)"} @ ${values.ADMIN_LLM_BASE_URL}`
                    : "Lovable AI (credits)"}
                </span>
              </div>
              <div className="flex gap-2">
                <Link to="/chat" className="inline-flex items-center text-xs px-2.5 py-1.5 rounded border hover:bg-muted">
                  Try live chat →
                </Link>
                <Button size="sm" variant="secondary" onClick={runTest} disabled={testing}>
                  {testing ? "Testing…" : "Test connection"}
                </Button>
              </div>
            </div>
            {testResult && (
              <pre className="text-xs bg-muted/50 rounded p-2 overflow-auto max-h-48">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>



        {FIELDS.map((f) => {
          const row = byKey[f.key];
          const dirty = (values[f.key] ?? "") !== unwrap(row?.value);
          return (
            <Card key={f.key}>
              <CardHeader>
                <CardTitle className="text-lg">{f.label}</CardTitle>
                <CardDescription>{f.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label htmlFor={f.key} className="font-mono text-xs">
                  {f.key}
                </Label>
                {f.kind === "textarea" ? (
                  <Textarea
                    id={f.key}
                    value={values[f.key] ?? ""}
                    onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    rows={4}
                  />
                ) : (
                  <Input
                    id={f.key}
                    type={f.secret ? "password" : f.kind === "number" ? "number" : "text"}
                    value={values[f.key] ?? ""}
                    onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                  />
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {row
                      ? `Last updated ${new Date(row.updated_at).toLocaleString()}`
                      : "Using env default"}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => save(f)}
                    disabled={saving === f.key || !dirty}
                  >
                    {saving === f.key ? "Saving…" : dirty ? "Save" : "Saved"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
