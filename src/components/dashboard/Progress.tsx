import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import type { Activity, Job, Salesperson } from "@/lib/db";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function lastNDates(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setUTCDate(d.getUTCDate() - i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

export function RevenueTrend({
  salespeople,
  jobs,
  days = 30,
}: {
  salespeople: Salesperson[];
  jobs: Job[];
  days?: number;
}) {
  const data = useMemo(() => {
    const dates = lastNDates(days);
    const cumulative: Record<string, number> = {};
    salespeople.forEach((p) => (cumulative[p.id] = 0));
    return dates.map((date) => {
      jobs
        .filter((j) => j.closed_at === date)
        .forEach((j) => (cumulative[j.salesperson_id] = (cumulative[j.salesperson_id] ?? 0) + j.revenue));
      const row: Record<string, string | number> = { date: date.slice(5) };
      salespeople.forEach((p) => (row[p.name] = cumulative[p.id] ?? 0));
      return row;
    });
  }, [salespeople, jobs, days]);

  return (
    <div className="rounded-2xl border border-border/60 bg-card-gradient p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Cumulative revenue</div>
          <h3 className="font-display text-xl font-semibold">Last {days} days</h3>
        </div>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
            <XAxis dataKey="date" stroke="oklch(0.7 0.02 260)" fontSize={11} />
            <YAxis stroke="oklch(0.7 0.02 260)" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{
                background: "oklch(0.22 0.014 260)",
                border: "1px solid oklch(0.3 0.012 260)",
                borderRadius: 10,
              }}
              formatter={(v: number) => fmt(v)}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {salespeople.map((p) => (
              <Line
                key={p.id}
                type="monotone"
                dataKey={p.name}
                stroke={p.color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function PersonProgress({
  person,
  jobs,
  activity,
}: {
  person: Salesperson;
  jobs: Job[];
  activity: Activity[];
}) {
  const stats = useMemo(() => {
    const pJobs = jobs.filter((j) => j.salesperson_id === person.id);
    const pAct = activity.filter((a) => a.salesperson_id === person.id);
    const totalRevenue = pJobs.reduce((s, j) => s + j.revenue, 0);
    const totalHours = pJobs.reduce((s, j) => s + j.hours, 0);
    const knocks = pAct.reduce((s, a) => s + a.doors_knocked, 0);
    const appts = pAct.reduce((s, a) => s + a.appointments_set, 0);
    const closes = pJobs.length;
    const closingRate = appts > 0 ? (closes / appts) * 100 : 0;
    const revPerHour = totalHours > 0 ? totalRevenue / totalHours : 0;

    // last 7 days
    const week = lastNDates(7);
    const last7 = pAct.filter((a) => week.includes(a.log_date));
    const knocksWeek = last7.reduce((s, a) => s + a.doors_knocked, 0);
    const apptsWeek = last7.reduce((s, a) => s + a.appointments_set, 0);
    const today = new Date().toISOString().slice(0, 10);
    const todayAct = pAct.find((a) => a.log_date === today);

    const trend = week.map((d) => {
      const day = pAct.find((a) => a.log_date === d);
      const rev = pJobs.filter((j) => j.closed_at === d).reduce((s, j) => s + j.revenue, 0);
      return {
        date: d.slice(5),
        doors: day?.doors_knocked ?? 0,
        revenue: rev,
      };
    });

    return {
      totalRevenue,
      totalHours,
      knocks,
      appts,
      closes,
      closingRate,
      revPerHour,
      knocksWeek,
      apptsWeek,
      knocksToday: todayAct?.doors_knocked ?? 0,
      apptsToday: todayAct?.appointments_set ?? 0,
      trend,
    };
  }, [person, jobs, activity]);

  return (
    <div className="rounded-2xl border border-border/60 bg-card-gradient p-6 shadow-card">
      <div className="flex flex-wrap items-center gap-4">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-xl font-display text-xl font-semibold"
          style={{ backgroundColor: person.color + "33", color: person.color }}
        >
          {person.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-[180px]">
          <div className="font-display text-2xl font-semibold">{person.name}</div>
          <div className="text-xs text-muted-foreground">
            {stats.closes} closed · {stats.totalHours.toFixed(1)}h logged
          </div>
        </div>
        <Stat label="All-time revenue" value={fmt(stats.totalRevenue)} accent />
        <Stat label="Closing rate" value={`${stats.closingRate.toFixed(1)}%`} />
        <Stat label="Rev / hour" value={fmt(stats.revPerHour)} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MiniStat label="Knocks today" value={stats.knocksToday} sub={`${stats.knocksWeek} this week`} />
        <MiniStat label="Appts today" value={stats.apptsToday} sub={`${stats.apptsWeek} this week`} />
        <MiniStat label="Total knocks" value={stats.knocks} sub={`${stats.appts} appts set`} />
      </div>

      <div className="mt-6 h-44">
        <ResponsiveContainer>
          <LineChart data={stats.trend} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
            <XAxis dataKey="date" stroke="oklch(0.7 0.02 260)" fontSize={11} />
            <YAxis stroke="oklch(0.7 0.02 260)" fontSize={11} />
            <Tooltip
              contentStyle={{
                background: "oklch(0.22 0.014 260)",
                border: "1px solid oklch(0.3 0.012 260)",
                borderRadius: 10,
              }}
            />
            <Line type="monotone" dataKey="doors" stroke={person.color} strokeWidth={2} dot={false} name="Doors" />
            <Line type="monotone" dataKey="revenue" stroke="oklch(0.82 0.16 88)" strokeWidth={2} dot={false} name="Revenue $" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className={`font-display text-xl font-semibold ${accent ? "text-gold" : ""}`}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 p-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="font-display text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
