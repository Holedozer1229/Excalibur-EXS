import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Mic, Square, Volume2, Loader2, Sparkles, Download, FileText, FileDown } from "lucide-react";
import { exportTranscriptPdf, exportTranscriptText } from "@/lib/exportTranscript";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { PageHead } from "@/components/PageHead";
import { supabase } from "@/integrations/supabase/client";
import SelfContainedLlmBanner from "@/components/SelfContainedLlmBanner";
import PoeticsFooter from "@/components/PoeticsFooter";
import GlyphSigil from "@/components/GlyphSigil";
import PaywallCTA from "@/components/PaywallCTA";
import AetherionChatTerminal from "@/components/AetherionChatTerminal";
import { useVoiceRecorder, transcribeWav, streamSpeech, type SpeechHandle } from "@/lib/voice";
import { expandSlashCommand, SLASH_COMMANDS } from "@/lib/chatCommands";
import { useIntentField } from "@/lib/intentField";
import { IntentFieldPanel } from "@/components/IntentFieldPanel";
import { getAttachPref, setAttachPref } from "@/lib/emfBaseline";

type Msg = { role: "user" | "assistant"; content: string; toolNote?: string; glyph?: string; theme?: string };
type Thread = { id: string; title: string; updated_at: string };

const MAX_CHARS = 4000;

export default function Chat() {
  const { threadId } = useParams<{ threadId?: string }>();
  const navigate = useNavigate();

  const [userId, setUserId] = useState<string | null | undefined>(undefined); // undefined = loading
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [matchedThreadIds, setMatchedThreadIds] = useState<Set<string> | null>(null);
  const [snippets, setSnippets] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Voice input + TTS
  const voice = useVoiceRecorder();
  const intentField = useIntentField();
  const [attachField, setAttachField] = useState<boolean>(false);
  const [includeGlyph, setIncludeGlyph] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("aetherion.includeGlyph") === "1";
  });
  useEffect(() => {
    try { window.localStorage.setItem("aetherion.includeGlyph", includeGlyph ? "1" : "0"); } catch { /* noop */ }
  }, [includeGlyph]);
  // Load per-device attach preference on mount (getDeviceId needs window).
  useEffect(() => {
    setAttachField(getAttachPref());
  }, []);
  const handleAttachChange = useCallback((v: boolean) => {
    setAttachField(v);
    setAttachPref(v);
  }, []);
  const [transcribing, setTranscribing] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Mic sensitivity multiplier for the waveform display (does NOT amplify
  // the recorded audio — STT still receives raw PCM). Persisted per browser.
  const [micGain, setMicGain] = useState<number>(() => {
    if (typeof window === "undefined") return 3;
    const raw = window.localStorage.getItem("aetherion.micGain");
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n >= 0.5 && n <= 12 ? n : 3;
  });
  useEffect(() => {
    try { window.localStorage.setItem("aetherion.micGain", String(micGain)); } catch { /* noop */ }
  }, [micGain]);

  // Audio input devices — enumerate after any getUserMedia grant so labels appear.
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [micDeviceId, setMicDeviceId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("aetherion.micDeviceId") ?? "";
  });
  useEffect(() => {
    try { window.localStorage.setItem("aetherion.micDeviceId", micDeviceId); } catch { /* noop */ }
  }, [micDeviceId]);
  const refreshMics = useCallback(async () => {
    try {
      const md = navigator.mediaDevices;
      if (!md?.enumerateDevices) return;
      const all = await md.enumerateDevices();
      setMics(all.filter((d) => d.kind === "audioinput"));
    } catch { /* noop */ }
  }, []);
  useEffect(() => {
    void refreshMics();
    const md = navigator.mediaDevices;
    if (!md?.addEventListener) return;
    const h = () => void refreshMics();
    md.addEventListener("devicechange", h);
    return () => md.removeEventListener("devicechange", h);
  }, [refreshMics]);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const speechRef = useRef<SpeechHandle | null>(null);

  // Slash-command popover
  const [showSlash, setShowSlash] = useState(false);
  const slashMatches = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (!q.startsWith("/") || q.includes(" ")) return [];
    return SLASH_COMMANDS.filter((c) => c.key.startsWith(q));
  }, [input]);


  // Auth gate
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  // Debounced content search across messages
  useEffect(() => {
    const q = search.trim();
    if (!userId || q.length < 2) {
      setMatchedThreadIds(null);
      setSnippets({});
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      const escaped = q.replace(/[%_\\]/g, (c) => `\\${c}`);
      const { data, error } = await supabase
        .from("chat_messages" as never)
        .select("thread_id,content,created_at")
        .ilike("content", `%${escaped}%`)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) { console.error(error); setSearching(false); return; }
      const ids = new Set<string>();
      const snips: Record<string, string> = {};
      for (const row of (data ?? []) as Array<{ thread_id: string; content: string }>) {
        if (snips[row.thread_id]) continue;
        ids.add(row.thread_id);
        const idx = row.content.toLowerCase().indexOf(q.toLowerCase());
        const start = Math.max(0, idx - 24);
        snips[row.thread_id] = (start > 0 ? "…" : "") + row.content.slice(start, start + 100);
      }
      setMatchedThreadIds(ids);
      setSnippets(snips);
      setSearching(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [search, userId]);

  // Load thread list
  const refreshThreads = useCallback(async () => {
    const { data, error } = await supabase
      .from("chat_threads" as never)
      .select("id,title,updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) { console.error(error); return [] as Thread[]; }
    const list = (data ?? []) as Thread[];
    setThreads(list);
    return list;
  }, []);

  // On sign-in, load threads and route to most recent (or create one)
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const list = await refreshThreads();
      if (!threadId) {
        if (list.length > 0) navigate(`/chat/${list[0].id}`, { replace: true });
        else {
          const id = await createThread();
          if (id) navigate(`/chat/${id}`, { replace: true });
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Load messages for active thread
  useEffect(() => {
    if (!userId || !threadId) { setMessages([]); return; }
    setLoadingThread(true);
    (async () => {
      const { data, error } = await supabase
        .from("chat_messages" as never)
        .select("role,content,created_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (error) {
        toast.error("Could not load thread", { description: error.message });
        setMessages([]);
      } else {
        setMessages(
          ((data ?? []) as Array<{ role: string; content: string }>)
            .filter((r) => r.role === "user" || r.role === "assistant")
            .map((r) => ({ role: r.role as "user" | "assistant", content: r.content })),
        );
      }
      setLoadingThread(false);
    })();
  }, [userId, threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    if (!streaming && !loadingThread) textareaRef.current?.focus();
  }, [streaming, loadingThread, threadId]);

  async function createThread(title = "New conversation"): Promise<string | null> {
    if (!userId) return null;
    const { data, error } = await supabase
      .from("chat_threads" as never)
      .insert({ user_id: userId, title } as never)
      .select("id,title,updated_at")
      .single();
    if (error || !data) { toast.error("Could not create thread", { description: error?.message }); return null; }
    const t = data as unknown as Thread;
    setThreads((prev) => [t, ...prev]);
    return t.id;
  }

  async function newChat() {
    const id = await createThread();
    if (id) navigate(`/chat/${id}`);
  }

  async function deleteThread(id: string) {
    if (!confirm("Delete this conversation?")) return;
    const { error } = await supabase.from("chat_threads" as never).delete().eq("id", id);
    if (error) { toast.error("Delete failed", { description: error.message }); return; }
    const remaining = threads.filter((t) => t.id !== id);
    setThreads(remaining);
    if (id === threadId) {
      if (remaining[0]) navigate(`/chat/${remaining[0].id}`, { replace: true });
      else {
        const newId = await createThread();
        if (newId) navigate(`/chat/${newId}`, { replace: true });
      }
    }
  }

  async function renameIfFirstMessage(text: string) {
    if (!threadId) return;
    const current = threads.find((t) => t.id === threadId);
    if (!current || current.title !== "New conversation") return;
    const title = text.slice(0, 60);
    await supabase.from("chat_threads" as never).update({ title } as never).eq("id", threadId);
    setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, title } : t)));
  }

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming || !userId || !threadId) return;

    // Slash-command expansion. `displayUser` is what the user sees in the
    // transcript; `llmContent` is what the LLM actually receives.
    const expanded = expandSlashCommand(text);
    const displayUser = expanded?.displayUser ?? text;
    const llmUserContent = expanded?.llmContent ?? text;
    const toolNote = expanded?.toolNote;

    // Optimistic UI (with any oracle toolNote attached to the assistant turn)
    const nextMessages: Msg[] = [
      ...messages,
      { role: "user", content: displayUser },
      { role: "assistant", content: "", toolNote },
    ];
    setMessages(nextMessages);
    setInput("");
    setShowSlash(false);
    setStreaming(true);

    // Persist user message (display copy so the transcript reads naturally)
    const { error: userInsertErr } = await supabase.from("chat_messages" as never).insert({
      thread_id: threadId, user_id: userId, role: "user", content: displayUser,
    } as never);
    if (userInsertErr) {
      toast.error("Could not save message", { description: userInsertErr.message });
      setStreaming(false);
      return;
    }
    void renameIfFirstMessage(displayUser);

    const ac = new AbortController();
    abortRef.current = ac;
    let acc = "";

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-stream`;
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData.session?.access_token;
      if (!jwt) {
        toast.error("Please sign in to chat");
        setStreaming(false);
        return;
      }
      // Build LLM payload: swap the last user turn's content for the
      // expanded slash prompt while keeping the rest of the history intact.
      // Optionally prepend a live intent-field snapshot so Aetherion can
      // weave the reading into its response.
      const fieldLine = attachField && intentField.running
        ? `[${intentField.snapshot()}]\n\n`
        : "";
      const finalUserContent = fieldLine + llmUserContent;
      const llmMessages = nextMessages.slice(0, -1).map((m, i, arr) =>
        i === arr.length - 1 && m.role === "user"
          ? { role: m.role, content: finalUserContent }
          : { role: m.role, content: m.content },
      );
      const res = await fetch(url, {
        method: "POST",
        signal: ac.signal,
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ messages: llmMessages, include_glyph: includeGlyph }),
      });

      setProvider(res.headers.get("X-LLM-Provider"));
      setModel(res.headers.get("X-LLM-Model"));

      if (!res.ok || !res.body) {
        let detail = `HTTP ${res.status}`;
        try { const j = await res.json(); detail = j.error ?? detail; } catch { /* */ }
        throw new Error(detail);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line) continue;
          try {
            const obj = JSON.parse(line);
            if (typeof obj.delta === "string") {
              acc += obj.delta;
              setMessages((m) => {
                const copy = m.slice();
                const prev = copy[copy.length - 1];
                copy[copy.length - 1] = { ...prev, role: "assistant", content: acc };
                return copy;
              });
            } else if (typeof obj.glyph === "string" && obj.glyph) {
              const g = obj.glyph as string;
              const th = typeof obj.theme === "string" ? obj.theme : undefined;
              setMessages((m) => {
                const copy = m.slice();
                const prev = copy[copy.length - 1];
                copy[copy.length - 1] = { ...prev, role: "assistant", content: prev?.content ?? acc, glyph: g, theme: th };
                return copy;
              });
            } else if (obj.error) {
              throw new Error(obj.error);
            }
          } catch (e) {
            if (line.startsWith("{") && line.endsWith("}")) throw e;
          }
        }
      }
    } catch (e: unknown) {
      const err = e as { name?: string; message?: string };
      if (err?.name === "AbortError") {
        toast.message("Stream stopped");
      } else {
        toast.error("Chat failed", { description: err?.message ?? String(e) });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;

      // Persist assistant message (whatever streamed)
      if (acc.trim()) {
        const { error: asstErr } = await supabase.from("chat_messages" as never).insert({
          thread_id: threadId, user_id: userId, role: "assistant", content: acc,
        } as never);
        if (asstErr) console.error("assistant persist failed", asstErr);
      } else {
        // Remove empty placeholder
        setMessages((m) => {
          const last = m[m.length - 1];
          if (last?.role === "assistant" && last.content === "") return m.slice(0, -1);
          return m;
        });
      }
      void refreshThreads();
    }
  }, [input, messages, streaming, userId, threadId, threads, refreshThreads, attachField, intentField, includeGlyph]);

  function stop() { abortRef.current?.abort(); }

  // Voice → transcript → send. Records via useVoiceRecorder, then hits
  // /voice-transcribe and drops the final text into the input for review.
  const toggleVoice = useCallback(async () => {
    if (voice.status === "recording") {
      const blob = await voice.stop();
      if (!blob) { toast.message("Recording too short — try again."); return; }
      // Hold the WAV for preview instead of auto-transcribing.
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      return;
    }
    try {
      await voice.start(micDeviceId || undefined);
      // Labels are only populated after a permission grant — refresh now.
      void refreshMics();
    } catch {
      toast.error("Microphone permission denied");
    }
  }, [voice, previewUrl]);

  const cancelRecording = useCallback(async () => {
    await voice.cancel();
  }, [voice]);

  const discardPreview = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewBlob(null);
    setPreviewUrl(null);
  }, [previewUrl]);

  const confirmPreview = useCallback(async () => {
    if (!previewBlob) return;
    setTranscribing(true);
    try {
      const text = await transcribeWav(previewBlob);
      if (!text) { toast.message("Didn't catch that — try again."); return; }
      setInput((prev) => (prev ? `${prev} ${text}` : text));
      discardPreview();
    } catch (e) {
      toast.error("Transcription failed", { description: (e as Error).message });
    } finally {
      setTranscribing(false);
    }
  }, [previewBlob, discardPreview]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  // Speak an assistant reply through streaming TTS. Toggling on the same
  // message stops playback; starting a new one cancels the previous stream.
  const speakMessage = useCallback(async (idx: number, text: string) => {
    if (speakingIdx === idx) {
      speechRef.current?.stop();
      speechRef.current = null;
      setSpeakingIdx(null);
      return;
    }
    speechRef.current?.stop();
    setSpeakingIdx(idx);
    try {
      const handle = await streamSpeech(text.slice(0, 3500));
      speechRef.current = handle;
      handle.done.finally(() => {
        if (speechRef.current === handle) {
          speechRef.current = null;
          setSpeakingIdx((cur) => (cur === idx ? null : cur));
        }
      });
    } catch (e) {
      setSpeakingIdx(null);
      toast.error("Voice playback failed", { description: (e as Error).message });
    }
  }, [speakingIdx]);

  const stopSpeaking = useCallback(() => {
    speechRef.current?.stop();
    speechRef.current = null;
    setSpeakingIdx(null);
  }, []);

  useEffect(() => () => { speechRef.current?.stop(); }, []);


  // — Render —
  if (userId === undefined) {
    return <main className="min-h-screen grid place-items-center bg-background text-muted-foreground text-sm">loading…</main>;
  }
  if (userId === null) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <PageHead
          title="Aetherion · Live Chat"
          description="Free on-host Caduceus chat — no signup required. Sign in to save threads."
          path="/chat"
        />
        <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-display tracking-widest text-primary">AETHERION · FREE</h1>
            <Link to="/auth?next=/chat" className="text-sm underline text-primary">
              sign in to save threads →
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Guest mode runs the on-host Caduceus LLM — no outside AI, no card, no gate.
          </p>
          <AetherionChatTerminal />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <PageHead
        title="Aetherion · Live Chat"
        description="Stream conversations with the Aetherion oracle. Threads saved per user account."
        path="/chat"
      />
      <div className="max-w-6xl mx-auto h-screen flex">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 border-r flex-col">
          <div className="p-3 border-b flex items-center justify-between">
            <span className="text-xs font-mono tracking-widest text-muted-foreground">THREADS</span>
            <Button size="sm" variant="ghost" onClick={newChat}>+ new</Button>
          </div>
          <div className="p-2 border-b">
            <div className="relative">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="search titles & messages…"
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs px-1"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            {search.trim().length >= 2 && (
              <p className="text-[10px] text-muted-foreground mt-1 px-1 font-mono">
                {searching ? "searching…" : `${(() => {
                  const q = search.trim().toLowerCase();
                  return threads.filter((t) =>
                    t.title.toLowerCase().includes(q) || matchedThreadIds?.has(t.id)
                  ).length;
                })()} match`}
              </p>
            )}
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {(() => {
              const q = search.trim().toLowerCase();
              const filtered = q.length >= 2
                ? threads.filter((t) => t.title.toLowerCase().includes(q) || matchedThreadIds?.has(t.id))
                : threads;
              if (threads.length === 0) {
                return <p className="text-xs text-muted-foreground px-3 py-4">No conversations yet.</p>;
              }
              if (filtered.length === 0) {
                return <p className="text-xs text-muted-foreground px-3 py-4">No matches.</p>;
              }
              return filtered.map((t) => (
                <div
                  key={t.id}
                  className={`group flex items-start gap-1 px-2 ${t.id === threadId ? "bg-primary/10" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/chat/${t.id}`)}
                    className="flex-1 text-left py-2 px-1 hover:text-primary min-w-0"
                    title={t.title}
                  >
                    <div className="truncate text-xs">{t.title || "Untitled"}</div>
                    {q.length >= 2 && snippets[t.id] && !t.title.toLowerCase().includes(q) && (
                      <div className="truncate text-[10px] text-muted-foreground font-mono mt-0.5">
                        {snippets[t.id]}
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteThread(t.id)}
                    className="opacity-0 group-hover:opacity-60 hover:opacity-100 text-xs px-1 py-2"
                    aria-label="Delete thread"
                  >
                    ✕
                  </button>
                </div>
              ));
            })()}
          </div>
        </aside>


        {/* Conversation */}
        <section className="flex-1 flex flex-col px-4 py-4">
          <div className="mb-3"><SelfContainedLlmBanner compact /></div>
          <header className="flex items-center justify-between border-b pb-3">
            <div>
              <h1 className="text-xl font-display tracking-widest text-primary">AETHERION · LIVE</h1>
              <p className="text-[11px] text-muted-foreground font-mono">
                {provider && model ? `${provider} · ${model}` : "saved to your account"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIncludeGlyph((v) => !v)}
                aria-pressed={includeGlyph}
                title={includeGlyph ? "Glyph sigil on — click to disable" : "Include glyph sigil with each reply"}
                className={`hidden sm:inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-mono uppercase tracking-widest transition-colors ${
                  includeGlyph
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <span aria-hidden>◈</span>
                <span>glyph {includeGlyph ? "on" : "off"}</span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={messages.length === 0 || streaming}
                    aria-label="Export transcript"
                    title="Export transcript"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    <span className="text-xs">export</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => {
                      const t = threads.find((x) => x.id === threadId)?.title || "aetherion-chat";
                      void exportTranscriptPdf(t, messages);
                    }}
                  >
                    <FileDown className="h-3.5 w-3.5 mr-2" />
                    Download as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      const t = threads.find((x) => x.id === threadId)?.title || "aetherion-chat";
                      exportTranscriptText(t, messages);
                    }}
                  >
                    <FileText className="h-3.5 w-3.5 mr-2" />
                    Download as text
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" variant="ghost" className="md:hidden" onClick={newChat}>+ new</Button>
              <Link to="/" className="text-xs text-muted-foreground hover:text-foreground underline">home</Link>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-4">
            {loadingThread && <p className="text-xs text-muted-foreground">loading thread…</p>}
            {!loadingThread && messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm pt-16 space-y-4">
                <p className="font-display tracking-widest text-primary">ask the lattice</p>
                <p className="text-xs">
                  Routed through your active LLM provider. Switch any time in{" "}
                  <Link to="/admin/settings" className="underline">/admin/settings</Link>.
                </p>
                <div className="mx-auto max-w-md grid gap-2 text-left pt-2">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">Oracle tools</p>
                  {SLASH_COMMANDS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => { setInput(c.example); textareaRef.current?.focus(); }}
                      className="group flex items-start gap-2 rounded-md border border-border bg-card/50 px-3 py-2 hover:border-primary/50 transition-colors"
                    >
                      <Sparkles className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="font-mono text-xs text-primary">{c.key}</span>
                        <span className="mx-1.5 text-muted-foreground/50">·</span>
                        <span className="text-xs text-foreground/80">{c.hint}</span>
                        <span className="block text-[10px] font-mono text-muted-foreground/60 truncate mt-0.5">{c.example}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => {
              const assistantCount = messages.slice(0, i + 1).filter((x) => x.role === "assistant" && x.content).length;
              const showUpsell = m.role === "assistant" && m.content && assistantCount > 0 && assistantCount % 4 === 0
                && !(streaming && i === messages.length - 1);
              const isSpeaking = speakingIdx === i;
              return (
                <div key={i}>
                  {m.toolNote && m.role === "assistant" && (
                    <div className="mr-auto max-w-[90%] mb-1 text-[11px] font-mono text-primary/80 flex items-center gap-1.5">
                      <span>{m.toolNote}</span>
                    </div>
                  )}
                  <div
                    className={
                      m.role === "user"
                        ? "ml-auto max-w-[85%] bg-primary/10 border border-primary/30 rounded-lg px-3 py-2 text-sm whitespace-pre-wrap"
                        : "mr-auto max-w-[90%] bg-card/60 border border-border rounded-lg px-3 py-2 text-sm whitespace-pre-wrap font-serif leading-relaxed relative group"
                    }
                  >
                    {m.role === "assistant" && (m.glyph || (includeGlyph && streaming && i === messages.length - 1)) && (
                      <div className="mb-2">
                        <GlyphSigil
                          glyph={m.glyph ?? null}
                          theme={m.theme ?? null}
                          loading={!m.glyph && includeGlyph && streaming && i === messages.length - 1}
                        />
                      </div>
                    )}
                    {m.content || <span className="text-muted-foreground animate-pulse">…channeling</span>}
                    {m.role === "assistant" && m.content && !(streaming && i === messages.length - 1) && (
                      <>
                        <PoeticsFooter text={m.content} />
                        <button
                          type="button"
                          onClick={() => void speakMessage(i, m.content)}
                          className={`absolute top-1.5 right-1.5 rounded p-1 transition-colors ${
                            isSpeaking
                              ? "text-primary bg-primary/15"
                              : "text-muted-foreground/60 hover:text-primary opacity-0 group-hover:opacity-100"
                          }`}
                          aria-label={isSpeaking ? "Stop voice" : "Read aloud"}
                          title={isSpeaking ? "Stop voice" : "Read aloud"}
                        >
                          {isSpeaking ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                        </button>
                      </>
                    )}
                  </div>
                  {showUpsell && (
                    <div className="my-4">
                      <PaywallCTA
                        variant="card"
                        source="chat_inline"
                        tier="oracle_pro"
                        headline="Enjoying the oracle? Go deeper."
                        subline="You've cast a few readings — Oracle Pro lifts the daily cap, unlocks Pro Vision dreams, and seals every reading on-chain."
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {speakingIdx !== null && (
            <div className="sticky bottom-0 z-20 flex justify-center pointer-events-none pb-1">
              <button
                type="button"
                onClick={stopSpeaking}
                className="pointer-events-auto flex items-center gap-2 rounded-full border border-primary/40 bg-card/95 backdrop-blur px-3 py-1.5 text-xs font-mono text-primary shadow-lg hover:bg-primary/10 transition-colors"
                aria-label="Stop voice playback"
                title="Stop voice playback"
              >
                <Square className="h-3 w-3" />
                <span>stop speaking</span>
                <Volume2 className="h-3 w-3 animate-pulse" />
              </button>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t pt-3 space-y-2 relative">
            {/* Slash-command popover */}
            {showSlash && slashMatches.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 border border-border bg-card/95 backdrop-blur rounded-md shadow-lg overflow-hidden z-10">
                {slashMatches.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setInput(c.key + " "); setShowSlash(false); textareaRef.current?.focus(); }}
                    className="w-full text-left px-3 py-2 hover:bg-primary/10 flex items-center gap-2 border-b border-border last:border-b-0"
                  >
                    <span className="font-mono text-xs text-primary w-16 shrink-0">{c.key}</span>
                    <span className="text-xs text-muted-foreground truncate">{c.hint}</span>
                  </button>
                ))}
              </div>
            )}
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                const v = e.target.value.slice(0, MAX_CHARS);
                setInput(v);
                setShowSlash(v.startsWith("/") && !v.includes(" "));
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape" && showSlash) { setShowSlash(false); return; }
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
              }}
              placeholder='whisper to the oracle… try "/tarot", "/dream", "/symbol"'
              rows={2}
              className="resize-none"
              disabled={streaming || loadingThread}
            />
            <IntentFieldPanel field={intentField} attach={attachField} onAttachChange={handleAttachChange} />
            {voice.status === "recording" && (() => {
              const BARS = 48;
              const src = voice.levels;
              const bars = src.length >= BARS ? src.slice(-BARS) : [...Array(BARS - src.length).fill(0), ...src];
              const secs = Math.floor(voice.elapsedMs / 1000);
              const mm = String(Math.floor(secs / 60)).padStart(2, "0");
              const ss = String(secs % 60).padStart(2, "0");
              return (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-destructive animate-pulse shrink-0" aria-hidden />
                    <span className="text-[10px] font-mono text-destructive uppercase tracking-widest shrink-0">rec</span>
                    <div
                      className="flex-1 h-8 flex items-center gap-[2px] overflow-hidden"
                      role="meter"
                      aria-label="Microphone input waveform"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(Math.min(1, voice.level * micGain) * 100)}
                    >
                      {bars.map((v, i) => {
                        const scaled = Math.min(1, v * micGain);
                        const clipping = v * micGain > 0.98;
                        const h = Math.max(6, scaled * 100);
                        const active = v > 0.001;
                        const cls = clipping
                          ? "bg-yellow-400"
                          : active
                            ? "bg-destructive"
                            : "bg-destructive/20";
                        return (
                          <span
                            key={i}
                            className={`flex-1 rounded-sm transition-[height] duration-75 ${cls}`}
                            style={{ height: `${h}%` }}
                          />
                        );
                      })}
                    </div>
                    <span className="text-[10px] font-mono text-destructive tabular-nums shrink-0">{mm}:{ss}</span>
                    <button
                      type="button"
                      onClick={() => void cancelRecording()}
                      className="text-[10px] font-mono text-muted-foreground hover:text-destructive px-1"
                      aria-label="Cancel recording"
                      title="Cancel recording — discard audio"
                    >
                      cancel
                    </button>
                  </div>
                  <div className="flex items-center gap-2 pl-4">
                    <label
                      htmlFor="mic-gain"
                      className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest shrink-0"
                    >
                      sens
                    </label>
                    <input
                      id="mic-gain"
                      type="range"
                      min={0.5}
                      max={12}
                      step={0.1}
                      value={micGain}
                      onChange={(e) => setMicGain(Number(e.target.value))}
                      className="flex-1 h-1 accent-destructive cursor-pointer"
                      aria-label="Microphone waveform sensitivity"
                      title="Waveform sensitivity — display only, does not amplify recording"
                    />
                    <span className="text-[9px] font-mono text-muted-foreground tabular-nums shrink-0 w-8 text-right">
                      {micGain.toFixed(1)}×
                    </span>
                    <button
                      type="button"
                      onClick={() => setMicGain(3)}
                      className="text-[9px] font-mono text-muted-foreground hover:text-foreground px-1"
                      title="Reset sensitivity"
                    >
                      reset
                    </button>
                  </div>
                </div>
              );
            })()}
            {previewBlob && previewUrl && (
              <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5">
                <span className="text-[10px] font-mono text-primary uppercase tracking-widest shrink-0">preview</span>
                <audio src={previewUrl} controls className="h-8 flex-1 min-w-0" />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={discardPreview}
                  disabled={transcribing}
                  className="text-xs"
                >
                  discard
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void confirmPreview()}
                  disabled={transcribing}
                  className="text-xs"
                >
                  {transcribing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "use"}
                </Button>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
                {input.length}/{MAX_CHARS} · saved to your account
              </span>
              <span className="text-[10px] text-muted-foreground font-mono sm:hidden">
                {input.length}/{MAX_CHARS}
              </span>
              <div className="flex gap-2 items-center">
                {mics.length > 0 && voice.status !== "recording" && (
                  <select
                    value={micDeviceId}
                    onChange={(e) => setMicDeviceId(e.target.value)}
                    disabled={streaming || loadingThread || transcribing || !!previewBlob}
                    className="max-w-[140px] h-8 text-[10px] font-mono bg-background border border-border rounded-md px-1.5 hover:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 truncate"
                    title="Microphone input device"
                    aria-label="Microphone input device"
                  >
                    <option value="">Default mic</option>
                    {mics.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Mic ${d.deviceId.slice(0, 6)}`}
                      </option>
                    ))}
                  </select>
                )}
                <Button
                  type="button"
                  variant={voice.status === "recording" ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => void toggleVoice()}
                  disabled={streaming || loadingThread || transcribing || !!previewBlob}
                  title={voice.status === "recording" ? "Stop recording (preview before sending)" : "Voice input"}
                  aria-label={voice.status === "recording" ? "Stop recording" : "Voice input"}
                >
                  {transcribing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : voice.status === "recording" ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                {streaming ? (
                  <Button type="button" variant="secondary" size="sm" onClick={stop}>stop</Button>
                ) : (
                  <Button type="submit" size="sm" disabled={!input.trim() || !threadId}>send</Button>
                )}
              </div>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
