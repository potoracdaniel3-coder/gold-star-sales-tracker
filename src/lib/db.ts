import { supabase } from "@/integrations/supabase/client";

export type Salesperson = {
  id: string;
  name: string;
  color: string;
  active: boolean;
  created_at: string;
  user_id: string | null;
};

export type JobStatus = "pending" | "approved" | "rejected";

export type Job = {
  id: string;
  salesperson_id: string;
  description: string;
  job_type: string;
  revenue: number;
  hours: number;
  closed_at: string;
  created_at: string;
  status: JobStatus;
  submitted_by: string | null;
  reviewer_id: string | null;
  reviewed_at: string | null;
  reject_reason: string | null;
};

export type Activity = {
  id: string;
  salesperson_id: string;
  log_date: string;
  doors_knocked: number;
  appointments_set: number;
  created_at: string;
};

export type GoalType =
  | "weekly_revenue"
  | "weekly_jobs"
  | "weekly_doors"
  | "weekly_appts"
  | "lifetime_revenue";

export type Goal = {
  id: string;
  salesperson_id: string;
  goal_type: GoalType;
  target: number;
  period_start: string | null;
  created_at: string;
};

export type Bonus = {
  id: string;
  label: string;
  weekly_revenue_threshold: number;
  bonus_amount: number;
  active: boolean;
  created_at: string;
};

export const qk = {
  salespeople: ["salespeople"] as const,
  jobs: ["jobs"] as const,
  activity: ["activity"] as const,
  goals: ["goals"] as const,
  bonuses: ["bonuses"] as const,
};

export async function fetchSalespeople(): Promise<Salesperson[]> {
  const { data, error } = await supabase
    .from("salespeople")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Salesperson[];
}

export async function fetchJobs(): Promise<Job[]> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("closed_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as Job[]).map((j) => ({
    ...j,
    revenue: Number(j.revenue),
    hours: Number(j.hours),
  }));
}

export async function fetchActivity(): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .order("log_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Activity[];
}

export async function fetchGoals(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as Goal[]).map((g) => ({ ...g, target: Number(g.target) }));
}

export async function fetchBonuses(): Promise<Bonus[]> {
  const { data, error } = await supabase
    .from("bonuses")
    .select("*")
    .order("weekly_revenue_threshold", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as Bonus[]).map((b) => ({
    ...b,
    weekly_revenue_threshold: Number(b.weekly_revenue_threshold),
    bonus_amount: Number(b.bonus_amount),
  }));
}

/** ISO date (UTC) for the Monday of the current week. */
export function weekStartISO(d = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay(); // 0 Sun..6 Sat
  const diff = (day + 6) % 7;   // Monday=0
  date.setUTCDate(date.getUTCDate() - diff);
  return date.toISOString().slice(0, 10);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Only approved jobs count towards leaderboard / stats. */
export function approvedJobs(jobs: Job[]): Job[] {
  return jobs.filter((j) => j.status === "approved");
}

/** Compute consecutive-week streak (weeks ending today) where person had ≥1 approved job. */
export function computeStreak(jobs: Job[]): number {
  if (jobs.length === 0) return 0;
  const weeks = new Set(jobs.map((j) => weekStartISO(new Date(j.closed_at + "T00:00:00Z"))));
  let streak = 0;
  const cursor = new Date(weekStartISO() + "T00:00:00Z");
  while (weeks.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 7);
  }
  return streak;
}

export const JOB_TYPES = [
  "deck",
  "driveway",
  "house",
  "fence",
  "patio",
  "roof",
  "concrete",
  "commercial",
  "other",
] as const;

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  weekly_revenue: "Weekly revenue",
  weekly_jobs: "Weekly jobs closed",
  weekly_doors: "Weekly doors knocked",
  weekly_appts: "Weekly appointments set",
  lifetime_revenue: "All-time revenue",
};

/** XP system: $1 = 1 XP, 10,000 XP per level. */
export const XP_PER_LEVEL = 10000;
export function xpFromRevenue(revenue: number): number {
  return Math.floor(revenue);
}
export function levelFromXp(xp: number): { level: number; into: number; toNext: number; pct: number } {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const into = xp % XP_PER_LEVEL;
  return { level, into, toNext: XP_PER_LEVEL - into, pct: (into / XP_PER_LEVEL) * 100 };
}
