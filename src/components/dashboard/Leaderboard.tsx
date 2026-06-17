import { useMemo } from "react";
import { Crown, TrendingUp, Trophy } from "lucide-react";
import type { Job, Salesperson } from "@/lib/db";
import { weekStartISO } from "@/lib/db";
import { cn } from "@/lib/utils";

type Row = {
  person: Salesperson;
  weekRevenue: number;
  totalRevenue: number;
  jobsThisWeek: number;
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function Leaderboard({
  salespeople,
  jobs,
}: {
  salespeople: Salesperson[];
  jobs: Job[];
}) {
  const rows = useMemo<Row[]>(() => {
    const weekStart = weekStartISO();
    return salespeople
      .map((p) => {
        const all = jobs.filter((j) => j.salesperson_id === p.id);
        const wk = all.filter((j) => j.closed_at >= weekStart);
        return {
          person: p,
          weekRevenue: wk.reduce((s, j) => s + j.revenue, 0),
          totalRevenue: all.reduce((s, j) => s + j.revenue, 0),
          jobsThisWeek: wk.length,
        };
      })
      .sort((a, b) => b.weekRevenue - a.weekRevenue);
  }, [salespeople, jobs]);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card-gradient p-10 text-center text-muted-foreground">
        Add a salesperson to get started.
      </div>
    );
  }

  const leader = rows[0];
  const rest = rows.slice(1);

  return (
    <div className="space-y-6">
      <LeaderPedestal row={leader} />
      {rest.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {rest.map((r, i) => (
            <RankRow key={r.person.id} row={r} rank={i + 2} />
          ))}
        </div>
      )}
    </div>
  );
}

function LeaderPedestal({ row }: { row: Row }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[oklch(0.78_0.14_85_/_30%)] bg-leader-gradient p-8 shadow-gold">
      <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[radial-gradient(circle,oklch(0.82_0.16_88_/_30%),transparent_70%)]" />
      <div className="flex flex-wrap items-center gap-6">
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-[oklch(0.82_0.16_88_/_40%)] bg-gold-gradient text-3xl font-bold shadow-gold">
            {row.person.name.charAt(0).toUpperCase()}
          </div>
          <Crown className="absolute -top-4 left-1/2 -translate-x-1/2 rotate-[-8deg] text-gold drop-shadow-[0_4px_12px_oklch(0.82_0.16_88_/_60%)]" size={28} />
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold/80">
            <Trophy size={14} /> Week leader
          </div>
          <div className="mt-1 font-display text-4xl font-semibold tracking-tight">
            {row.person.name}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {row.jobsThisWeek} {row.jobsThisWeek === 1 ? "job" : "jobs"} closed this week
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">This week</div>
          <div className="font-display text-5xl font-semibold text-gold">{fmt(row.weekRevenue)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            All-time {fmt(row.totalRevenue)}
          </div>
        </div>
      </div>
    </div>
  );
}

function RankRow({ row, rank }: { row: Row; rank: number }) {
  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card-gradient p-5 shadow-card transition-colors hover:border-border">
      <div className={cn(
        "flex h-12 w-12 items-center justify-center rounded-xl font-display text-lg font-semibold",
        rank === 2 && "bg-[oklch(0.6_0.02_260)] text-foreground",
        rank === 3 && "bg-[oklch(0.45_0.05_30)] text-foreground",
        rank > 3 && "bg-secondary text-muted-foreground",
      )}>
        {rank}
      </div>
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl font-semibold"
        style={{ backgroundColor: row.person.color + "33", color: row.person.color }}
      >
        {row.person.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1">
        <div className="font-display text-lg font-medium">{row.person.name}</div>
        <div className="text-xs text-muted-foreground">
          {row.jobsThisWeek} jobs · all-time {fmt(row.totalRevenue)}
        </div>
      </div>
      <div className="text-right">
        <div className="font-display text-2xl font-semibold">{fmt(row.weekRevenue)}</div>
        <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
          <TrendingUp size={12} /> this week
        </div>
      </div>
    </div>
  );
}
