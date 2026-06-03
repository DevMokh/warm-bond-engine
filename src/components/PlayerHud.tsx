import { Sparkles, Flame, Coins, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfileStats, levelProgress } from "@/hooks/useProfileStats";

type Props = {
  className?: string;
  compact?: boolean;
};

/**
 * Floating HUD with XP/Level/Coins/Streak. Reads from useProfileStats.
 * Hidden when no user / no stats.
 */
export const PlayerHud = ({ className, compact }: Props) => {
  const { stats } = useProfileStats();
  if (!stats) return null;
  const lp = levelProgress(stats.total_xp || 0, stats.level || 1);

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-full bg-card/90 backdrop-blur border border-border/60 shadow-sm",
      compact ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
      className,
    )}>
      {/* Level */}
      <span className="inline-flex items-center gap-1 font-bold text-primary" title={`المستوى ${stats.level} · ${lp.into}/${lp.needed} XP`}>
        <Trophy className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
        <span>Lv {stats.level}</span>
      </span>
      <span className="text-border">·</span>
      {/* XP bar */}
      <span className="flex items-center gap-1" title={`${lp.into}/${lp.needed} XP`}>
        <Sparkles className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5", "text-warning")} />
        <span className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
          <span className="block h-full bg-gradient-to-r from-warning to-primary" style={{ width: `${lp.pct}%` }} />
        </span>
      </span>
      <span className="text-border">·</span>
      {/* Coins */}
      <span className="inline-flex items-center gap-1 font-bold text-warning" title="عملات">
        <Coins className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
        <span>{stats.coins ?? 0}</span>
      </span>
      <span className="text-border">·</span>
      {/* Streak */}
      <span className={cn(
        "inline-flex items-center gap-1 font-bold",
        (stats.current_streak || 0) > 0 ? "text-destructive" : "text-muted-foreground",
      )} title={`أعلى سلسلة: ${stats.longest_streak ?? 0}`}>
        <Flame className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
        <span>{stats.current_streak ?? 0}</span>
      </span>
    </div>
  );
};
