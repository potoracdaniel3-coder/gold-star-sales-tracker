import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Gift } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { qk, type Bonus } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function BonusesManager({ bonuses }: { bonuses: Bonus[] }) {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [threshold, setThreshold] = useState("");
  const [amount, setAmount] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bonuses").insert({
        label: label.trim(),
        weekly_revenue_threshold: Number(threshold),
        bonus_amount: Number(amount),
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.bonuses });
      setLabel(""); setThreshold(""); setAmount("");
      toast.success("Bonus added");
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

  return (
    <div className="rounded-2xl border border-border/60 bg-card-gradient p-6 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        <Gift className="h-5 w-5 text-gold" />
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Manager-set rewards</div>
          <h3 className="font-display text-xl font-semibold">Weekly revenue bonuses</h3>
        </div>
      </div>

      <div className="space-y-2">
        {bonuses.length === 0 && (
          <p className="text-sm text-muted-foreground">No bonuses yet. Create one below to motivate the team.</p>
        )}
        {bonuses.map((b) => (
          <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium">{b.label}</div>
              <div className="text-xs text-muted-foreground">
                Hit {fmt(b.weekly_revenue_threshold)} in a week → earn {fmt(b.bonus_amount)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{b.active ? "Active" : "Off"}</span>
              <Switch checked={b.active} onCheckedChange={(v) => toggle.mutate({ id: b.id, active: v })} />
            </div>
            <Button variant="ghost" size="icon" onClick={() => { if (confirm("Remove bonus?")) del.mutate(b.id); }}>
              <Trash2 className="text-destructive h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 border-t border-border/60 pt-5">
        <Label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Add bonus</Label>
        <Input placeholder="e.g. Week Crusher" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} />
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Weekly revenue ($)</Label>
            <Input type="number" min="0" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Bonus payout ($)</Label>
            <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
        <Button variant="gold" onClick={() => add.mutate()} disabled={!label.trim() || !threshold || !amount || add.isPending}>
          <Plus /> {add.isPending ? "Adding…" : "Add bonus"}
        </Button>
      </div>
    </div>
  );
}
