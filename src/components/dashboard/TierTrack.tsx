import { Check, Lock, Shield } from "lucide-react";
import { TIERS, tierFromRevenue } from "@/lib/gamification";
import { cn } from "@/lib/utils";

function fmt(n: number) {
  if (n >= 1000) return "$" + (n / 1000).toFixed(n >= 10_000 ? 0 : 1) + "k";
  return "$" + n;
}

export function TierTrack({ totalRevenue }: { totalRevenue: number }) {
  const { current, next, progressPct, toNext } = tierFromRevenue(totalRevenue);
  return (
    <div className="rounded-3xl border border-border/60 bg-card-gradient p-6 shadow-card">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Career tier</div>
          <h3 className="font-display text-2xl font-semibold">
            <span style={{ color: current.color }}>{current.label}</span>
          </h3>
          {next ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {fmt(toNext)} more all-time revenue to reach{" "}
              <span className="font-semibold" style={{ color: next.color }}>{next.label}</span>
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Top tier reached. Legend status.</p>
          )}
        </div>
      </div>

      {/* Tier track */}
      <div className="relative">
        {/* base line */}
        <div className="absolute left-6 right-6 top-7 h-1 rounded-full bg-border/50" />
        {/* fill line */}
        <div
          className="absolute left-6 top-7 h-1 rounded-full transition-all"
          style={{
            width: `calc((100% - 3rem) * ${TIERS.findIndex((t) => t.key === current.key) / (TIERS.length - 1) + (next ? (progressPct / 100) * (1 / (TIERS.length - 1)) : 0)})`,
            background: `linear-gradient(90deg, ${TIERS[0].color}, ${current.color})`,
            boxShadow: `0 0 16px ${current.color}66`,
          }}
        />

        <div className="relative grid" style={{ gridTemplateColumns: `repeat(${TIERS.length}, minmax(0,1fr))` }}>
          {TIERS.map((t) => {
            const reached = totalRevenue >= t.threshold;
            const isCurrent = t.key === current.key;
            return (
              <div key={t.key} className="flex flex-col items-center text-center">
                <div
                  className={cn(
                    "relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border-2 transition-all",
                    isCurrent && "scale-110",
                  )}
                  style={{
                    borderColor: reached ? t.color : "var(--border)",
                    backgroundColor: reached ? t.color + "22" : "var(--background)",
                    boxShadow: isCurrent ? `0 8px 28px ${t.color}55` : reached ? `0 0 0 1px ${t.color}33` : undefined,
                  }}
                >
                  {reached ? (
                    <Shield className="h-6 w-6" style={{ color: t.color, fill: t.color + "55" }} />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground/60" />
                  )}
                  {reached && !isCurrent && (
                    <div
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px]"
                      style={{ backgroundColor: t.color, color: "#000" }}
                    >
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <div
                  className={cn("mt-2 font-display text-xs font-semibold tracking-wider uppercase", !reached && "text-muted-foreground/70")}
                  style={reached ? { color: t.color } : undefined}
                >
                  {t.label}
                </div>
                <div className="text-[10px] text-muted-foreground">{t.threshold === 0 ? "Start" : fmt(t.threshold)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
