import { supabase } from "@/integrations/supabase/client";

export type Salesperson = {
  id: string;
  name: string;
  color: string;
  active: boolean;
  created_at: string;
};

export type Job = {
  id: string;
  salesperson_id: string;
  description: string;
  job_type: string;
  revenue: number;
  hours: number;
  closed_at: string;
  created_at: string;
};

export type Activity = {
  id: string;
  salesperson_id: string;
  log_date: string;
  doors_knocked: number;
  appointments_set: number;
  created_at: string;
};

export const qk = {
  salespeople: ["salespeople"] as const,
  jobs: ["jobs"] as const,
  activity: ["activity"] as const,
};

export async function fetchSalespeople(): Promise<Salesperson[]> {
  const { data, error } = await supabase
    .from("salespeople")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Salesperson[];
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
