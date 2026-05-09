import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Check, X, Scissors, Snowflake, Sparkles, Play, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export type MatchEvent = {
  id: string;
  match_id: string;
  user_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  question_index: number | null;
  created_at: string;
};

const fmt = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
};

type FilterKey = "answer" | "powerup_5050" | "powerup_freeze" | "powerup_double" | "question_start";

const FILTERS: { key: FilterKey; label: string; icon: JSX.Element }[] = [
  { key: "answer", label: "إجابات", icon: <Check className="h-3 w-3" /> },
  { key: "powerup_5050", label: "50/50", icon: <Scissors className="h-3 w-3" /> },
  { key: "powerup_freeze", label: "Freeze", icon: <Snowflake className="h-3 w-3" /> },
  { key: "powerup_double", label: "Double", icon: <Sparkles className="h-3 w-3" /> },
  { key: "question_start", label: "أسئلة", icon: <Play className="h-3 w-3" /> },
];

export const MatchTimeline = ({
  events,
  challengerName = "اللاعب 1",
  opponentName = "اللاعب 2",
  challengerId,
  highlightLastId,
}: {
  events: MatchEvent[];
  challengerName?: string;
  opponentName?: string;
  challengerId?: string;
  highlightLastId?: string;
}) => {
  const [active, setActive] = useState<Set<FilterKey>>(
    new Set(FILTERS.map((f) => f.key)),
  );

  const toggle = (k: FilterKey) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const filtered = useMemo(
    () => events.filter((e) => active.has(e.event_type as FilterKey)),
    [events, active],
  );

  const renderRow = (e: MatchEvent) => {
    const who = e.user_id === challengerId ? challengerName : opponentName;
    const isC = e.user_id === challengerId;
    let icon = <Play className="h-3.5 w-3.5" />;
    let badgeText: string | null = null;
    let text = e.event_type;
    const p = e.payload || {};
    switch (e.event_type) {
      case "question_start":
        icon = <Play className="h-3.5 w-3.5 text-muted-foreground" />;
        text = `بدأ سؤال ${(e.question_index ?? 0) + 1}`;
        break;
      case "answer": {
        const correct = (p as { correct?: boolean }).correct;
        icon = correct ? (
          <Check className="h-3.5 w-3.5 text-success" />
        ) : (
          <X className="h-3.5 w-3.5 text-destructive" />
        );
        badgeText = correct ? "صح" : "غلط";
        text = `أجاب على سؤال ${(e.question_index ?? 0) + 1}`;
        break;
      }
      case "powerup_5050":
        icon = <Scissors className="h-3.5 w-3.5 text-primary" />;
        badgeText = "50/50";
        text = "استخدم Power-up";
        break;
      case "powerup_freeze":
        icon = <Snowflake className="h-3.5 w-3.5 text-primary" />;
        badgeText = "Freeze ❄️";
        text = "استخدم Power-up";
        break;
      case "powerup_double":
        icon = <Sparkles className="h-3.5 w-3.5 text-primary" />;
        badgeText = "Double ✨";
        text = "استخدم Power-up";
        break;
    }
    const isLast = highlightLastId && e.id === highlightLastId;
    return (
      <li
        key={e.id}
        className={cn(
          "flex items-center justify-between gap-2 text-xs py-2 px-2 border-b border-border/40 last:border-0 rounded transition-colors",
          isLast && "bg-primary/10",
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span
            className={cn(
              "font-bold truncate max-w-[80px]",
              isC ? "text-primary" : "text-accent-foreground",
            )}
          >
            {who}
          </span>
          <span className="text-muted-foreground truncate">{text}</span>
          {badgeText && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0">
              {badgeText}
            </Badge>
          )}
        </div>
        <span className="font-mono text-muted-foreground text-[10px] shrink-0">
          {fmt(e.created_at)}
        </span>
      </li>
    );
  };

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <Clock className="h-3 w-3" /> مجريات المباراة ({filtered.length}/
            {events.length})
          </div>
          <Filter className="h-3 w-3 text-muted-foreground" />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => {
            const on = active.has(f.key);
            return (
              <Button
                key={f.key}
                size="sm"
                variant={on ? "default" : "outline"}
                onClick={() => toggle(f.key)}
                className="h-6 px-2 text-[10px] gap-1"
              >
                {f.icon}
                {f.label}
              </Button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">
            مفيش أحداث مطابقة...
          </p>
        ) : (
          <ul className="max-h-[320px] overflow-y-auto">{filtered.map(renderRow)}</ul>
        )}
      </CardContent>
    </Card>
  );
};
