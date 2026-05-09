import { Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const SeriesProgress = ({
  bestOf,
  challengerWins,
  opponentWins,
  challengerName,
  opponentName,
  currentRound,
}: {
  bestOf: number;
  challengerWins: number;
  opponentWins: number;
  challengerName: string;
  opponentName: string;
  currentRound?: number;
}) => {
  const winsNeeded = Math.ceil(bestOf / 2);
  const cRemaining = Math.max(0, winsNeeded - challengerWins);
  const oRemaining = Math.max(0, winsNeeded - opponentWins);
  const seriesWinner =
    challengerWins >= winsNeeded ? "c" : opponentWins >= winsNeeded ? "o" : null;

  // Build slot dots: total = bestOf
  const slots = Array.from({ length: bestOf }, (_, i) => {
    const round = i + 1;
    if (round <= challengerWins + opponentWins) {
      // already played; we don't know which side per slot here, use neutral filled
      return "played" as const;
    }
    if (currentRound && round === currentRound) return "current" as const;
    return "pending" as const;
  });

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          <Badge variant="outline" className="gap-1">
            <Trophy className="h-3 w-3" /> Best of {bestOf}
          </Badge>
          <span className="text-muted-foreground">
            أول من يصل لـ {winsNeeded}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
          <div className={cn("space-y-1", seriesWinner === "c" && "text-success")}>
            <div className="text-[11px] truncate">{challengerName}</div>
            <div className="text-2xl font-extrabold">{challengerWins}</div>
            {!seriesWinner && (
              <div className="text-[10px] text-muted-foreground">
                يحتاج {cRemaining}
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground font-bold">VS</div>
          <div className={cn("space-y-1", seriesWinner === "o" && "text-success")}>
            <div className="text-[11px] truncate">{opponentName}</div>
            <div className="text-2xl font-extrabold">{opponentWins}</div>
            {!seriesWinner && (
              <div className="text-[10px] text-muted-foreground">
                يحتاج {oRemaining}
              </div>
            )}
          </div>
        </div>

        {/* Round dots */}
        <div className="flex justify-center gap-1.5">
          {slots.map((s, i) => (
            <div
              key={i}
              className={cn(
                "h-2 rounded-full transition-all",
                s === "played" && "w-6 bg-primary",
                s === "current" && "w-8 bg-primary/60 animate-pulse",
                s === "pending" && "w-6 bg-muted",
              )}
              aria-label={`جولة ${i + 1}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
