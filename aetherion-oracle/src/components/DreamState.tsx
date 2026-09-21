// Ambient idle "dream state" overlay — engages when Oracle page is idle.
// Drifts whispered phonetic fragments across the screen, intensifies the cinematic feel.
// Click anywhere or press any key to wake.
import { useEffect, useState, useRef } from "react";
import { Moon } from "lucide-react";

interface Props {
  idleMs?: number;
  harmony?: number;
  enabled?: boolean;
  wakeDebounceMs?: number;
}


const FRAGMENTS = [
  "ae · the · ri · on", "ka · du · ke · us", "ɔr · ə · kəl",
  "rə · zə · nəns", "θɹɛʃ · hoʊld", "sɪɡ · nəl",
  "ɛn · tɹeɪn", "luː · mɪ · nəs", "ɪn · vəʊ · keɪ · ʃən",
  "sɪl · vər · θɹɛd", "ɸoʊ · noʊn", "voɪd · sɪŋ",
  "the seeker breathes", "a serpent of light", "brass mirrors hum",
  "you are remembered", "the threshold opens", "harmony returns to one",
];

interface Drift {
  id: number;
  text: string;
  top: number;
  left: number;
  duration: number;
  delay: number;
  size: number;
}

const DreamState = ({ idleMs = 45000, harmony = 0.5, enabled = true, wakeDebounceMs = 0 }: Props) => {
  const [dreaming, setDreaming] = useState(false);
  const [drifts, setDrifts] = useState<Drift[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);
  const lastActivityRef = useRef<number>(0);
  const dreamingRef = useRef(false);

  useEffect(() => { dreamingRef.current = dreaming; }, [dreaming]);

  const enterDream = () => {
    if (wakeTimerRef.current) { clearTimeout(wakeTimerRef.current); wakeTimerRef.current = null; }
    dreamingRef.current = true;
    setDreaming(true);
  };

  const wake = () => {
    if (!dreamingRef.current) return;
    if (wakeDebounceMs <= 0) {
      dreamingRef.current = false;
      setDreaming(false);
      return;
    }
    lastActivityRef.current = Date.now();
    if (wakeTimerRef.current) return;
    wakeTimerRef.current = setTimeout(() => {
      wakeTimerRef.current = null;
      if (Date.now() - lastActivityRef.current >= wakeDebounceMs) {
        dreamingRef.current = false;
        setDreaming(false);
      }
    }, wakeDebounceMs);
  };

  const reset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!enabled) return;
    timerRef.current = setTimeout(enterDream, idleMs);
    wake();
  };


  useEffect(() => {
    if (!enabled) return;
    const events = ["mousemove", "keydown", "touchstart", "pointerdown", "wheel"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, idleMs, wakeDebounceMs]);

  // Spawn drifting fragments while dreaming
  useEffect(() => {
    if (!dreaming) { setDrifts([]); return; }
    const density = Math.round(2 + harmony * 4);
    const spawn = () => {
      setDrifts((prev) => {
        const next = [...prev];
        for (let i = 0; i < density; i++) {
          idRef.current += 1;
          next.push({
            id: idRef.current,
            text: FRAGMENTS[Math.floor(Math.random() * FRAGMENTS.length)],
            top: 10 + Math.random() * 75,
            left: -20 + Math.random() * 10,
            duration: 14 + Math.random() * 12 - harmony * 4,
            delay: Math.random() * 1.5,
            size: 11 + Math.random() * 6,
          });
        }
        // Cap to avoid memory growth
        return next.slice(-40);
      });
    };
    spawn();
    const iv = setInterval(spawn, 4200);
    return () => clearInterval(iv);
  }, [dreaming, harmony]);

  if (!dreaming) return null;
  return (
    <div
      className="fixed inset-0 z-40 pointer-events-none animate-fade-in"
      aria-hidden
      style={{
        background: "radial-gradient(ellipse at center, hsl(var(--background) / 0.25) 0%, hsl(var(--background) / 0.55) 70%)",
        backdropFilter: "blur(2px) saturate(140%)",
      }}
    >
      {/* Dream chip */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-sm border border-gold/40 bg-card/40 backdrop-blur-md font-display uppercase tracking-[0.3em] text-[10px] text-gold">
        <Moon className="w-3 h-3 animate-pulse" />
        dream state · move to wake
      </div>
      {/* Drifting phonetic fragments */}
      {drifts.map((d) => (
        <span
          key={d.id}
          className="absolute font-mono text-serpent/70 whitespace-nowrap"
          style={{
            top: `${d.top}%`,
            left: `${d.left}%`,
            fontSize: `${d.size}px`,
            textShadow: "0 0 12px hsl(var(--neon-cyan) / 0.45)",
            animation: `dream-drift ${d.duration}s linear ${d.delay}s forwards`,
            opacity: 0,
          }}
        >
          {d.text}
        </span>
      ))}
      <style>{`
        @keyframes dream-drift {
          0%   { transform: translateX(0) translateY(0); opacity: 0; }
          10%  { opacity: 0.8; }
          90%  { opacity: 0.8; }
          100% { transform: translateX(140vw) translateY(-30px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default DreamState;
