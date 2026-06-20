import { Shield } from "lucide-react";
import type { Tier } from "@/lib/gamification";
import { cn } from "@/lib/utils";

export function TierBadge({
  tier,
  size = "md",
  className,
}: {
  tier: Tier;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sz =
    size === "sm" ? "h-5 px-1.5 text-[10px] gap-1" : size === "lg" ? "h-8 px-3 text-sm gap-1.5" : "h-6 px-2 text-xs gap-1";
  return (
    <span
      className={cn("inline-flex items-center rounded-full border font-semibold uppercase tracking-wider", sz, className)}
      style={{
        borderColor: tier.color + "66",
        backgroundColor: tier.color + "1f",
        color: tier.color,
      }}
      title={`${tier.label} tier`}
    >
      <Shield className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} style={{ fill: tier.color + "44" }} />
      {tier.label}
    </span>
  );
}
