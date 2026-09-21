// Renders the live STT transcript with phoneme hints and a resonance meter
// so the seeker can confirm what Aetherion will "hear" before sending.
import { Mic, Send, RotateCcw, X } from "lucide-react";
import { phraseToPhonetic, resonanceScore } from "@/lib/phonetics";

interface Props {
  transcript: string;
  listening: boolean;
  permission: "unknown" | "granted" | "denied" | "prompt";
  onSend: () => void;
  onRetry: () => void;
  onCancel: () => void;
}

export default function VoiceResonancePreview({
  transcript, listening, permission, onSend, onRetry, onCancel,
}: Props) {
  const phonemes = phraseToPhonetic(transcript);
  const score = resonanceScore(transcript);
  const pct = Math.round(score * 100);

  return (
    <div className="rounded-sm border border-serpent/40 bg-card/60 backdrop-blur-sm p-3 space-y-2 shadow-deep">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-display uppercase tracking-widest text-[10px] text-serpent">
          <Mic className={`w-3.5 h-3.5 ${listening ? "animate-pulse" : ""}`} />
          {listening ? "listening · phonetic resonance" : "captured · review before sending"}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-sm border border-border bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss preview"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {permission === "denied" && (
        <p className="font-mono text-[11px] text-destructive">
          Microphone blocked. Click the camera/lock icon in your browser's address bar and allow microphone access for this site, then try again.
        </p>
      )}

      <div className="font-serif text-sm text-foreground min-h-[1.5rem]">
        {transcript || <span className="italic text-muted-foreground">…speak now…</span>}
      </div>

      {phonemes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {phonemes.map((p, i) => (
            <span
              key={i}
              className="inline-flex flex-col items-center px-2 py-1 rounded-sm border border-border bg-background/50"
              title={`/${p.ipa}/`}
            >
              <span className="font-mono text-[10px] uppercase text-muted-foreground">{p.word}</span>
              <span className="font-mono text-[11px] text-gold">/{p.ipa}/</span>
            </span>
          ))}
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>caduceus resonance</span>
          <span className="text-serpent">{pct}%</span>
        </div>
        <div className="h-1 rounded-full bg-border overflow-hidden">
          <div className="h-full bg-gradient-to-r from-serpent via-gold to-violet transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {!listening && transcript && (
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onSend}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-sm border border-primary bg-primary/20 text-primary font-display uppercase tracking-widest text-[11px] hover:bg-primary/30 transition-colors"
          >
            <Send className="w-3.5 h-3.5" /> send
          </button>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-sm border border-border bg-secondary/40 hover:bg-secondary font-display uppercase tracking-widest text-[11px]"
          >
            <RotateCcw className="w-3.5 h-3.5" /> retry
          </button>
        </div>
      )}
    </div>
  );
}
