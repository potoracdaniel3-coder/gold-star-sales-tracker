import { Check, Gift, Lock } from "lucide-react";
import type { Bonus } from "@/lib/db";
import { cn } from "@/lib/utils";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/** Gamified horizontal rewards path. Tiers a salesman has unlocked (weeklyRevenue ≥ threshold) get a check. */
export function RewardsTrack({
  bonuses,
  weeklyRevenue,
}: {
  bonuses: Bonus[];
  weeklyRevenue: number;
}) {
  const active = bonuses.filter((b) => b.active).sort((a, b) => a.weekly_revenue_threshold - b.weekly_revenue_threshold);
  if (active.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card-gradient p-6 shadow-card">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Rewards</div>
        <h3 className="font-display text-xl font-semibold">Rewards path</h3>
        <p className="mt-3 text-sm text-muted-foreground">
          Your manager hasn't set any weekly bonuses yet. When they do, hitting weekly revenue targets unlocks payouts.
        </p>
      </div>
    );
  }
  const next = active.find((b) => weeklyRevenue < b.weekly_revenue_threshold);
  const remaining = next ? next.weekly_revenue_threshold - weeklyRevenue : 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-card-gradient p-6 shadow-card">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Rewards path</div>
          <h3 className="font-display text-xl font-semibold">This week's bonuses</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            You're at <span className="text-gold font-semibold">{fmt(weeklyRevenue)}</span> this week.
            {next ? <> Next reward in <span className="text-foreground font-semibold">{fmt(remaining)}</span>.</> : " All rewards unlocked 🎉"}
          </p>
        </div>
      </div>

      <div className="relative overflow-x-auto pb-2">
        <div className="absolute left-0 right-0 top-[52px] mx-6 h-1 rounded-full bg-border/60" />
        <div
          className="absolute left-0 top-[52px] ml-6 h-1 rounded-full bg-gold transition-all"
          style={{
            width: `${Math.min(100, (weeklyRevenue / active[active.length - 1].weekly_revenue_threshold) * 100)}%`,
            maxWidth: "calc(100% - 3rem)",
          }}
        />
        <div className="relative flex min-w-max gap-4 px-2">
          {active.map((b) => {
            const unlocked = weeklyRevenue >= b.weekly_revenue_threshold;
            return (
              <div key={b.id} className="flex w-40 flex-col items-center text-center">
                <div
                  className={cn(
                    "relative flex h-28 w-32 flex-col items-center justify-center rounded-2xl border-2 p-2 shadow-card",
                    unlocked
                      ? "border-gold/60 bg-gold/15"
                      : "border-border/60 bg-background/40 opacity-75",
                  )}
                >
                  {unlocked ? (
                    <div className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-gold text-black shadow">
                      <Check className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Lock className="h-3 w-3" />
                    </div>
                  )}
                  <Gift className={cn("h-8 w-8", unlocked ? "text-gold" : "text-muted-foreground")} />
                  <div className="mt-1 font-display text-lg font-semibold text-gold">{fmt(b.bonus_amount)}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">bonus</div>
                </div>
                <div className="mt-3 h-4 w-4 rounded-full border-2 border-gold bg-background" />
                <div className="mt-2 text-xs font-semibold">{fmt(b.weekly_revenue_threshold)}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-2">{b.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
