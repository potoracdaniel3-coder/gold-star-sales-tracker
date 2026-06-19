import type { Job } from "@/lib/db";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

const badgeClass: Record<string, string> = {
  pending: "border-gold/40 bg-gold/10 text-gold",
  approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  rejected: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function MySubmissions({ jobs }: { jobs: Job[] }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card-gradient p-6 shadow-card">
      <div className="mb-4">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Submission history</div>
        <h3 className="font-display text-xl font-semibold">My submissions</h3>
      </div>
      {jobs.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No submissions yet.</p>
      ) : (
        <div className="divide-y divide-border/40">
          {jobs.slice(0, 20).map((j) => (
            <div key={j.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium capitalize">
                  {j.job_type} <span className="text-xs text-muted-foreground">· {j.closed_at}</span>
                </div>
                <div className="truncate text-xs text-muted-foreground">{j.description}</div>
                {j.status === "rejected" && j.reject_reason && (
                  <div className="mt-1 text-xs text-destructive">Reason: {j.reject_reason}</div>
                )}
              </div>
              <div className="text-right">
                <div className="font-display text-base font-semibold text-gold">{fmt(j.revenue)}</div>
                <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${badgeClass[j.status]}`}>
                  {j.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
