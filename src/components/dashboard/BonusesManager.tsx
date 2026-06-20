import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Award, Coins, Gift, Plus, Sparkles, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  BONUS_METRIC_LABELS,
  BONUS_PERIOD_LABELS,
  REWARD_TYPE_LABELS,
  qk,
  type Bonus,
  type BonusMetric,
  type BonusPeriod,
  type RewardType,
} from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

function fmtThreshold(b: Pick<Bonus, "metric" | "threshold">) {
  if (b.metric === "revenue") return "$" + b.threshold.toLocaleString();
  return b.threshold.toLocaleString();
}

const REWARD_META: Record<RewardType, { icon: React.ComponentType<{ className?: string }>; color: string; placeholder: string }> = {
  cash: { icon: Coins, color: "text-gold", placeholder: "$500" },
  prize: { icon: Gift, color: "text-cyan-300", placeholder: "PlayStation 5" },
  recognition: { icon: Trophy, color: "text-purple-300", placeholder: "Top Dog title for the month" },
  time_off: { icon: Sparkles, color: "text-emerald-300", placeholder: "Friday off" },
};

export function BonusesManager({ bonuses }: { bonuses: Bonus[] }) {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [metric, setMetric] = useState<BonusMetric>("revenue");
  const [period, setPeriod] = useState<BonusPeriod>("weekly");
  const [threshold, setThreshold] = useState("");
  const [rewardType, setRewardType] = useState<RewardType>("cash");
  const [rewardValue, setRewardValue] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bonuses").insert({
        label: label.trim(),
        metric,
        period,
        threshold: Number(threshold),
        reward_type: rewardType,
        reward_value: rewardValue.trim(),
        active: true,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.bonuses });
      setLabel(""); setThreshold(""); setRewardValue("");
      toast.success("Reward added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("bonuses").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.bonuses }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bonuses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.bonuses });
      toast.success("Removed");
    },
  });

  const RewardIcon = REWARD_META[rewardType].icon;

  return (
    <div className="rounded-2xl border border-border/60 bg-card-gradient p-6 shadow-card">
      <div className="mb-5 flex items-center gap-2">
        <Award className="h-5 w-5 text-gold" />
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Manager-set rewards</div>
          <h3 className="font-display text-xl font-semibold">Goals & rewards</h3>
        </div>
      </div>

      <div className="space-y-2">
        {bonuses.length === 0 && (
          <p className="text-sm text-muted-foreground">No rewards yet. Define a goal and what unlocks below.</p>
        )}
        {bonuses.map((b) => {
          const meta = REWARD_META[b.reward_type];
          const Icon = meta.icon;
          return (
            <div
              key={b.id}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-xl border p-3 transition",
                b.active ? "border-border/60 bg-background/40" : "border-border/30 bg-background/20 opacity-60",
              )}
            >
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 bg-background/60", meta.color)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-display text-base font-semibold">{b.label}</div>
                  <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {REWARD_TYPE_LABELS[b.reward_type]}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Hit <span className="text-foreground font-semibold">{fmtThreshold(b)} {BONUS_METRIC_LABELS[b.metric].toLowerCase()}</span>{" "}
                  {BONUS_PERIOD_LABELS[b.period]} → <span className={cn("font-semibold", meta.color)}>{b.reward_value}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{b.active ? "Active" : "Off"}</span>
                <Switch checked={b.active} onCheckedChange={(v) => toggle.mutate({ id: b.id, active: v })} />
              </div>
              <Button variant="ghost" size="icon" onClick={() => { if (confirm("Remove reward?")) del.mutate(b.id); }}>
                <Trash2 className="text-destructive h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-border/60 bg-background/30 p-4">
        <Label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Add reward</Label>

        <div className="mt-3 grid gap-3">
          <Input placeholder="Name — e.g. Week Crusher, Door Domination" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} />

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label className="text-[11px] text-muted-foreground">Goal type</Label>
              <Select value={metric} onValueChange={(v) => setMetric(v as BonusMetric)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(BONUS_METRIC_LABELS) as BonusMetric[]).map((m) => (
                    <SelectItem key={m} value={m}>{BONUS_METRIC_LABELS[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[11px] text-muted-foreground">Timeframe</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as BonusPeriod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="lifetime">All-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[11px] text-muted-foreground">
                Target {metric === "revenue" ? "($)" : `(${BONUS_METRIC_LABELS[metric].toLowerCase()})`}
              </Label>
              <Input type="number" min="0" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
            <div className="grid gap-1.5">
              <Label className="text-[11px] text-muted-foreground">Reward type</Label>
              <Select value={rewardType} onValueChange={(v) => setRewardType(v as RewardType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(REWARD_TYPE_LABELS) as RewardType[]).map((r) => (
                    <SelectItem key={r} value={r}>{REWARD_TYPE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <RewardIcon className={cn("h-3.5 w-3.5", REWARD_META[rewardType].color)} />
                What they get
              </Label>
              <Input
                placeholder={REWARD_META[rewardType].placeholder}
                value={rewardValue}
                onChange={(e) => setRewardValue(e.target.value)}
                maxLength={80}
              />
            </div>
          </div>

          <Button
            variant="gold"
            onClick={() => add.mutate()}
            disabled={!label.trim() || !threshold || !rewardValue.trim() || add.isPending}
          >
            <Plus /> {add.isPending ? "Adding…" : "Add reward"}
          </Button>
        </div>
      </div>
    </div>
  );
}
