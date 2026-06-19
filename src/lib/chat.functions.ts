import { createServerFn } from "@tanstack/react-start";
import { generateText, tool, stepCountIs, type ModelMessage } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const ChatInput = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
});

const SYSTEM_PROMPT = `You are a sales analytics assistant for a power-washing business dashboard.

You can ONLY answer questions about this app's sales data (salespeople, jobs, doors knocked, appointments, revenue, hours). If asked about anything else, politely redirect.

ALWAYS use the provided tools to read live data before answering numerical questions. Never make up numbers. Use tools to:
- get_overview: high-level totals, week + all-time
- get_salespeople: list team and their stats
- list_recent_jobs: recent closed jobs
- add_job: log a new closed job (you must collect: salesperson name, description, revenue, hours; optional: job_type, date)
- add_activity: log doors knocked + appointments for a salesperson on a date

When the user asks you to record something, confirm the details back and then call the tool. After tool calls, summarize the result for the user in clear plain language. Format currency as $1,234.`;

export const chatWithAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Manager gate
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isManager = (roles ?? []).some((r) => r.role === "manager");
    if (!isManager) {
      throw new Error("Forbidden: chatbot is for managers only.");
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-2.5-flash");

    const today = new Date().toISOString().slice(0, 10);

    const tools = {
      get_overview: tool({
        description: "Get high-level revenue and job totals: this week and all time.",
        inputSchema: z.object({}),
        execute: async () => {
          const weekStart = (() => {
            const d = new Date();
            const day = d.getUTCDay();
            const diff = (day + 6) % 7;
            d.setUTCDate(d.getUTCDate() - diff);
            return d.toISOString().slice(0, 10);
          })();
          const { data: jobs } = await supabase
            .from("jobs")
            .select("revenue, hours, closed_at, salesperson_id");
          const all = (jobs ?? []) as Array<{ revenue: number; hours: number; closed_at: string; salesperson_id: string }>;
          const weekRev = all.filter((j) => j.closed_at >= weekStart).reduce((s, j) => s + Number(j.revenue), 0);
          const totalRev = all.reduce((s, j) => s + Number(j.revenue), 0);
          return {
            week_start: weekStart,
            jobs_total: all.length,
            jobs_this_week: all.filter((j) => j.closed_at >= weekStart).length,
            revenue_this_week: weekRev,
            revenue_all_time: totalRev,
          };
        },
      }),
      get_salespeople: tool({
        description: "List salespeople with per-person revenue, jobs, doors knocked and appointments (week and all-time).",
        inputSchema: z.object({}),
        execute: async () => {
          const weekStart = (() => {
            const d = new Date();
            const day = d.getUTCDay();
            const diff = (day + 6) % 7;
            d.setUTCDate(d.getUTCDate() - diff);
            return d.toISOString().slice(0, 10);
          })();
          const [{ data: people }, { data: jobs }, { data: activity }] = await Promise.all([
            supabase.from("salespeople").select("id, name, active"),
            supabase.from("jobs").select("salesperson_id, revenue, closed_at"),
            supabase.from("activity_log").select("salesperson_id, doors_knocked, appointments_set, log_date"),
          ]);
          return (people ?? []).map((p) => {
            const pj = (jobs ?? []).filter((j) => j.salesperson_id === p.id);
            const pa = (activity ?? []).filter((a) => a.salesperson_id === p.id);
            const wj = pj.filter((j) => j.closed_at >= weekStart);
            const wa = pa.filter((a) => a.log_date >= weekStart);
            return {
              id: p.id,
              name: p.name,
              active: p.active,
              revenue_week: wj.reduce((s, j) => s + Number(j.revenue), 0),
              revenue_total: pj.reduce((s, j) => s + Number(j.revenue), 0),
              jobs_total: pj.length,
              doors_week: wa.reduce((s, a) => s + a.doors_knocked, 0),
              appointments_week: wa.reduce((s, a) => s + a.appointments_set, 0),
            };
          });
        },
      }),
      list_recent_jobs: tool({
        description: "List the most recent closed jobs.",
        inputSchema: z.object({ limit: z.number().int().min(1).max(50).default(10) }),
        execute: async ({ limit }) => {
          const { data: jobs } = await supabase
            .from("jobs")
            .select("id, description, job_type, revenue, hours, closed_at, salesperson_id")
            .order("closed_at", { ascending: false })
            .limit(limit);
          const { data: people } = await supabase.from("salespeople").select("id, name");
          const nameOf = new Map((people ?? []).map((p) => [p.id, p.name]));
          return (jobs ?? []).map((j) => ({
            ...j,
            revenue: Number(j.revenue),
            hours: Number(j.hours),
            salesperson: nameOf.get(j.salesperson_id) ?? "Unknown",
          }));
        },
      }),
      add_job: tool({
        description: "Record a new closed job. Use the salesperson's name (case-insensitive); the tool resolves it to an id.",
        inputSchema: z.object({
          salesperson_name: z.string(),
          description: z.string().min(1),
          revenue: z.number().nonnegative(),
          hours: z.number().nonnegative(),
          job_type: z.string().default("other"),
          closed_at: z.string().describe("YYYY-MM-DD").default(today),
        }),
        execute: async ({ salesperson_name, description, revenue, hours, job_type, closed_at }) => {
          const { data: people } = await supabase.from("salespeople").select("id, name");
          const match = (people ?? []).find(
            (p) => p.name.toLowerCase() === salesperson_name.toLowerCase(),
          );
          if (!match) {
            return {
              error: `No salesperson named "${salesperson_name}". Available: ${(people ?? []).map((p) => p.name).join(", ")}`,
            };
          }
          const { data, error } = await supabase
            .from("jobs")
            .insert({
              salesperson_id: match.id,
              description,
              job_type,
              revenue,
              hours,
              closed_at,
              status: "approved",
              submitted_by: userId,
              reviewer_id: userId,
              reviewed_at: new Date().toISOString(),
            })
            .select()
            .single();
          if (error) return { error: error.message };
          return { ok: true, job: { ...data, revenue: Number(data.revenue), hours: Number(data.hours) } };
        },
      }),
      add_activity: tool({
        description: "Log doors knocked and appointments set for a salesperson on a date.",
        inputSchema: z.object({
          salesperson_name: z.string(),
          doors_knocked: z.number().int().nonnegative(),
          appointments_set: z.number().int().nonnegative(),
          log_date: z.string().describe("YYYY-MM-DD").default(today),
        }),
        execute: async ({ salesperson_name, doors_knocked, appointments_set, log_date }) => {
          const { data: people } = await supabase.from("salespeople").select("id, name");
          const match = (people ?? []).find(
            (p) => p.name.toLowerCase() === salesperson_name.toLowerCase(),
          );
          if (!match) {
            return {
              error: `No salesperson named "${salesperson_name}". Available: ${(people ?? []).map((p) => p.name).join(", ")}`,
            };
          }
          const { data, error } = await supabase
            .from("activity_log")
            .insert({
              salesperson_id: match.id,
              doors_knocked,
              appointments_set,
              log_date,
            })
            .select()
            .single();
          if (error) return { error: error.message };
          return { ok: true, entry: data };
        },
      }),
    };

    const modelMessages: ModelMessage[] = data.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const result = await generateText({
      model,
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(50),
    });

    return { text: result.text };
  });
