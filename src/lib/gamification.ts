import type { Activity, Job } from "@/lib/db";
import { approvedJobs, weekStartISO } from "@/lib/db";

// ============= Tiers =============

export type Tier = {
  key: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  label: string;
  threshold: number;
  color: string;
};

export const TIERS: Tier[] = [
  { key: "bronze", label: "Bronze", threshold: 0, color: "#cd7f32" },
  { key: "silver", label: "Silver", threshold: 25_000, color: "#c0c0c0" },
  { key: "gold", label: "Gold", threshold: 75_000, color: "#d4af37" },
  { key: "platinum", label: "Platinum", threshold: 200_000, color: "#5ce1e6" },
  { key: "diamond", label: "Diamond", threshold: 500_000, color: "#9b8cff" },
];

export function tierFromRevenue(totalRevenue: number): {
  current: Tier;
  next: Tier | null;
  progressPct: number;
  toNext: number;
} {
  let current = TIERS[0];
  let next: Tier | null = TIERS[1] ?? null;
  for (let i = 0; i < TIERS.length; i++) {
    if (totalRevenue >= TIERS[i].threshold) {
      current = TIERS[i];
      next = TIERS[i + 1] ?? null;
    }
  }
  if (!next) return { current, next: null, progressPct: 100, toNext: 0 };
  const span = next.threshold - current.threshold;
  const into = totalRevenue - current.threshold;
  return {
    current,
    next,
    progressPct: Math.min(100, (into / span) * 100),
    toNext: Math.max(0, next.threshold - totalRevenue),
  };
}

// ============= Badges =============

export type BadgeDef = {
  key: string;
  label: string;
  description: string;
  icon: "first" | "closer" | "rain" | "ticket" | "streak3" | "streak6" | "doors" | "appts" | "top";
};

export const BADGES: BadgeDef[] = [
  { key: "first_blood", label: "First Blood", description: "Land your first approved job", icon: "first" },
  { key: "closer", label: "Closer", description: "Close 10 approved jobs", icon: "closer" },
  { key: "rainmaker", label: "Rainmaker", description: "Close 50 approved jobs", icon: "rain" },
  { key: "big_ticket", label: "Big Ticket", description: "Close a single job worth $10k+", icon: "ticket" },
  { key: "hot_streak", label: "Hot Streak", description: "Hit a 3-week streak", icon: "streak3" },
  { key: "on_fire", label: "On Fire", description: "Hit a 6-week streak", icon: "streak6" },
  { key: "door_crusher", label: "Door Crusher", description: "Knock 500 lifetime doors", icon: "doors" },
  { key: "appt_king", label: "Appointment King", description: "Set 100 lifetime appointments", icon: "appts" },
  { key: "top_dog", label: "Top Dog", description: "Currently #1 on the all-time leaderboard", icon: "top" },
];

export function computeBadges(opts: {
  personId: string;
  jobs: Job[]; // all jobs (any salesperson, any status)
  activity: Activity[]; // all activity rows
  weekStreak: number;
  isTopDog: boolean;
}): Set<string> {
  const mine = approvedJobs(opts.jobs).filter((j) => j.salesperson_id === opts.personId);
  const myActivity = opts.activity.filter((a) => a.salesperson_id === opts.personId);
  const doors = myActivity.reduce((s, a) => s + (a.doors_knocked || 0), 0);
  const appts = myActivity.reduce((s, a) => s + (a.appointments_set || 0), 0);
  const biggest = mine.reduce((m, j) => Math.max(m, j.revenue), 0);
  const earned = new Set<string>();
  if (mine.length >= 1) earned.add("first_blood");
  if (mine.length >= 10) earned.add("closer");
  if (mine.length >= 50) earned.add("rainmaker");
  if (biggest >= 10_000) earned.add("big_ticket");
  if (opts.weekStreak >= 3) earned.add("hot_streak");
  if (opts.weekStreak >= 6) earned.add("on_fire");
  if (doors >= 500) earned.add("door_crusher");
  if (appts >= 100) earned.add("appt_king");
  if (opts.isTopDog) earned.add("top_dog");
  return earned;
}

// ============= Daily streak =============

/** Day (UTC ISO) had ≥1 approved job OR ≥1 door knocked OR ≥1 appt set. */
export function computeDailyStreak(jobs: Job[], activity: Activity[]): number {
  const days = new Set<string>();
  for (const j of approvedJobs(jobs)) days.add(j.closed_at);
  for (const a of activity) {
    if ((a.doors_knocked || 0) > 0 || (a.appointments_set || 0) > 0) days.add(a.log_date);
  }
  if (days.size === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  // Reset to UTC date
  cursor.setUTCHours(0, 0, 0, 0);
  // If today has nothing, allow yesterday to start the streak so user has the day to log
  const todayISO = cursor.toISOString().slice(0, 10);
  if (!days.has(todayISO)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export function hasActivityToday(jobs: Job[], activity: Activity[], personId: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const j = approvedJobs(jobs).some((x) => x.salesperson_id === personId && x.closed_at === today);
  const a = activity.some(
    (x) => x.salesperson_id === personId && x.log_date === today && ((x.doors_knocked || 0) > 0 || (x.appointments_set || 0) > 0),
  );
  return j || a;
}

// ============= Daily challenge =============

export type DailyChallenge = {
  id: string;
  label: string;
  metric: "doors" | "appts" | "jobs" | "revenue";
  target: number;
};

const POOL: DailyChallenge[] = [
  { id: "doors30", label: "Knock 30 doors today", metric: "doors", target: 30 },
  { id: "doors50", label: "Knock 50 doors today", metric: "doors", target: 50 },
  { id: "appts3", label: "Set 3 appointments today", metric: "appts", target: 3 },
  { id: "appts5", label: "Set 5 appointments today", metric: "appts", target: 5 },
  { id: "job1", label: "Close 1 job today", metric: "jobs", target: 1 },
  { id: "rev2k", label: "Bank $2,000 in approved revenue today", metric: "revenue", target: 2000 },
  { id: "rev5k", label: "Bank $5,000 in approved revenue today", metric: "revenue", target: 5000 },
];

/** Deterministic daily pick so everyone sees the same challenge. */
export function dailyChallengeFor(date = new Date()): DailyChallenge {
  const iso = date.toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < iso.length; i++) hash = (hash * 31 + iso.charCodeAt(i)) | 0;
  return POOL[Math.abs(hash) % POOL.length];
}

export function challengeProgress(
  challenge: DailyChallenge,
  jobs: Job[],
  activity: Activity[],
  personId: string,
): { value: number; pct: number; done: boolean } {
  const today = new Date().toISOString().slice(0, 10);
  let value = 0;
  if (challenge.metric === "doors") {
    value = activity.filter((a) => a.salesperson_id === personId && a.log_date === today).reduce((s, a) => s + (a.doors_knocked || 0), 0);
  } else if (challenge.metric === "appts") {
    value = activity.filter((a) => a.salesperson_id === personId && a.log_date === today).reduce((s, a) => s + (a.appointments_set || 0), 0);
  } else if (challenge.metric === "jobs") {
    value = approvedJobs(jobs).filter((j) => j.salesperson_id === personId && j.closed_at === today).length;
  } else if (challenge.metric === "revenue") {
    value = approvedJobs(jobs).filter((j) => j.salesperson_id === personId && j.closed_at === today).reduce((s, j) => s + j.revenue, 0);
  }
  const pct = Math.min(100, (value / challenge.target) * 100);
  return { value, pct, done: value >= challenge.target };
}

// ============= Leaderboard helpers =============

export function totalRevenueFor(personId: string, jobs: Job[]): number {
  return approvedJobs(jobs).filter((j) => j.salesperson_id === personId).reduce((s, j) => s + j.revenue, 0);
}

export function weekRevenueFor(personId: string, jobs: Job[]): number {
  const wk = weekStartISO();
  return approvedJobs(jobs).filter((j) => j.salesperson_id === personId && j.closed_at >= wk).reduce((s, j) => s + j.revenue, 0);
}
