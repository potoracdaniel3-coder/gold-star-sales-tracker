import { Award, Crown, Flame, Hammer, Handshake, Lock, Medal, Star, Target, Zap } from "lucide-react";
import { BADGES, type BadgeDef } from "@/lib/gamification";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function Icon({ name, className }: { name: BadgeDef["icon"]; className?: string }) {
  const map = {
    first: <Star className={className} />,
    closer: <Target className={className} />,
    rain: <Award className={className} />,
    ticket: <Medal className={className} />,
    streak3: <Flame className={className} />,
    streak6: <Zap className={className} />,
    doors: <Hammer className={className} />,
    appts: <Handshake className={className} />,
    top: <Crown className={className} />,
  } as const;
  return map[name];
}

export function AchievementsGrid({ earned }: { earned: Set<string> }) {
  const unlocked = BADGES.filter((b) => earned.has(b.key)).length;
  return (
    <div className="rounded-2xl border border-border/60 bg-card-gradient p-6 shadow-card">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Achievements</div>
          <h3 className="font-display text-xl font-semibold">Badges earned</h3>
        </div>
        <div className="font-display text-sm text-muted-foreground">
          <span className="text-gold font-semibold">{unlocked}</span> / {BADGES.length}
        </div>
      </div>
      <TooltipProvider delayDuration={150}>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {BADGES.map((b) => {
            const got = earned.has(b.key);
            return (
              <Tooltip key={b.key}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "group flex aspect-square cursor-help flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-center transition-all",
                      got
                        ? "border-gold/60 bg-gold/10 text-gold shadow-gold"
                        : "border-border/50 bg-background/40 text-muted-foreground/60 opacity-70 hover:opacity-100",
                    )}
                  >
                    {got ? <Icon name={b.icon} className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                    <div className="text-[10px] font-semibold leading-tight">{b.label}</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <div className="text-xs font-semibold">{b.label}</div>
                  <div className="text-[11px] text-muted-foreground">{b.description}</div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}
