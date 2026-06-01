import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatchEvent } from "@/components/MatchTimeline";

/**
 * Side-by-side comparison: a unified time axis between two players showing
 * each player's events as markers (correct ✓ / wrong ✗ / powerup ⚡).
 */
export function PlayersCompare({
  events,
  challengerId,
  opponentId,
  challengerName,
  opponentName,
  totalQuestions,
}: {
  events: MatchEvent[];
  challengerId: string;
  opponentId: string;
  challengerName: string;
  opponentName: string;
  totalQuestions: number;
}) {
  const { tStart, tEnd } = useMemo(() => {
    if (events.length === 0) return { tStart: 0, tEnd: 1 };
    const s = new Date(events[0].created_at).getTime();
    const e = new Date(events[events.length - 1].created_at).getTime();
    return { tStart: s, tEnd: Math.max(e, s + 1) };
  }, [events]);

  const range = Math.max(1, tEnd - tStart);

  const renderRow = (uid: string, name: string, accent: "primary" | "accent") => {
    const mine = events.filter((e) => e.user_id === uid);
    const correct = mine.filter((e) => e.event_type === "answer" && (e.payload as { correct?: boolean }).correct).length;
    const wrong = mine.filter((e) => e.event_type === "answer" && !(e.payload as { correct?: boolean }).correct).length;
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className={cn("font-bold truncate", accent === "primary" ? "text-primary" : "text-accent-foreground")}>{name}</span>
          <div className="flex gap-1">
            <Badge variant="outline" className="text-[10px] h-5 gap-0.5"><Check className="h-2.5 w-2.5 text-success" />{correct}</Badge>
            <Badge variant="outline" className="text-[10px] h-5 gap-0.5"><X className="h-2.5 w-2.5 text-destructive" />{wrong}</Badge>
            <Badge variant="outline" className="text-[10px] h-5">{mine.filter(e=>e.event_type==="answer").length}/{totalQuestions}</Badge>
          </div>
        </div>
        <div className="relative h-6 rounded bg-muted/40 border border-border/40">
          {mine.map((e) => {
            const t = new Date(e.created_at).getTime();
            const left = ((t - tStart) / range) * 100;
            let cls = "bg-muted-foreground";
            let icon: JSX.Element = <Zap className="h-2.5 w-2.5" />;
            if (e.event_type === "answer") {
              const ok = (e.payload as { correct?: boolean }).correct;
              cls = ok ? "bg-success" : "bg-destructive";
              icon = ok ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />;
            } else if (e.event_type.startsWith("powerup_")) {
              cls = "bg-primary";
            } else {
              return null;
            }
            return (
              <span
                key={e.id}
                title={`${e.event_type} • س${(e.question_index ?? 0) + 1}`}
                className={cn("absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5 rounded-full flex items-center justify-center text-white shadow", cls)}
                style={{ insetInlineStart: `${left}%` }}
              >
                {icon}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
          <span>مقارنة على نفس الخط الزمني</span>
          <span className="font-mono text-[10px]">{Math.round(range / 1000)}s</span>
        </div>
        {renderRow(challengerId, challengerName, "primary")}
        {renderRow(opponentId, opponentName, "accent")}
        {/* legend */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success inline-block" /> صح</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive inline-block" /> غلط</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary inline-block" /> Power-up</span>
        </div>
      </CardContent>
    </Card>
  );
}
