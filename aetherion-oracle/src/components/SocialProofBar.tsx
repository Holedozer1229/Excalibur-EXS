// Live social proof: sealed readings, dreams interpreted, visitors today.
// Pulls aggregate counts from public-readable tables; falls back gracefully.
import { useEffect, useState } from "react";
import { Activity, Sparkles, Users, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  readingsTotal: number | null;
  dreamsTotal: number | null;
  readingsToday: number | null;
}

interface Props {
  compact?: boolean;
}

const SocialProofBar = ({ compact = false }: Props) => {
  const [stats, setStats] = useState<Stats>({
    readingsTotal: null,
    dreamsTotal: null,
    readingsToday: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("public_stats");
      if (cancelled || error || !data || !data[0]) return;
      const row = data[0] as {
        readings_total: number;
        readings_today: number;
        dreams_total: number;
      };
      setStats({
        readingsTotal: Number(row.readings_total),
        readingsToday: Number(row.readings_today),
        dreamsTotal: Number(row.dreams_total),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fmt = (n: number | null, fallback: string) =>
    n === null ? fallback : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;

  const items = [
    {
      icon: Sparkles,
      label: "sealed readings",
      value: fmt(stats.readingsTotal, "—"),
    },
    {
      icon: Activity,
      label: "today",
      value: fmt(stats.readingsToday, "—"),
    },
    {
      icon: Moon,
      label: "dreams interpreted",
      value: fmt(stats.dreamsTotal, "—"),
    },
    {
      icon: Users,
      label: "seekers growing daily",
      value: "live",
    },
  ];

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {items.slice(0, 3).map((it) => (
          <div key={it.label} className="flex items-center gap-1.5">
            <it.icon className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-foreground">{it.value}</span>
            <span>{it.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>seekers casting now</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-lg border border-border bg-card/40 backdrop-blur px-3 py-3 text-center"
        >
          <it.icon className="h-4 w-4 mx-auto mb-1 text-primary" />
          <div className="text-xl font-semibold tabular-nums">{it.value}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">
            {it.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SocialProofBar;
