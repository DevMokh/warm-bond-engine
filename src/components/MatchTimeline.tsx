import { Card, CardContent } from "@/components/ui/card";
import { Clock, Check, X, Scissors, Snowflake, Sparkles, Play } from "lucide-react";

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
  try { return new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
  catch { return "—"; }
};

export const MatchTimeline = ({
  events, challengerName = "اللاعب 1", opponentName = "اللاعب 2", challengerId,
}: {
  events: MatchEvent[];
  challengerName?: string;
  opponentName?: string;
  challengerId?: string;
}) => {
  const renderRow = (e: MatchEvent) => {
    const who = e.user_id === challengerId ? challengerName : opponentName;
    let icon = <Play className="h-3.5 w-3.5" />;
    let text = e.event_type;
    const p = e.payload || {};
    switch (e.event_type) {
      case "question_start":
        icon = <Play className="h-3.5 w-3.5 text-muted-foreground" />;
        text = `بدأ سؤال ${(e.question_index ?? 0) + 1}`;
        break;
      case "answer": {
        const correct = (p as { correct?: boolean }).correct;
        icon = correct ? <Check className="h-3.5 w-3.5 text-success" /> : <X className="h-3.5 w-3.5 text-destructive" />;
        text = `${who} أجاب — ${correct ? "صح" : "غلط"}`;
        break;
      }
      case "powerup_5050":
        icon = <Scissors className="h-3.5 w-3.5 text-primary" />;
        text = `${who} استخدم 50/50`;
        break;
      case "powerup_freeze":
        icon = <Snowflake className="h-3.5 w-3.5 text-primary" />;
        text = `${who} جمّد الوقت ❄️`;
        break;
      case "powerup_double":
        icon = <Sparkles className="h-3.5 w-3.5 text-primary" />;
        text = `${who} فعّل Double Points`;
        break;
    }
    return (
      <li key={e.id} className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-border/40 last:border-0">
        <div className="flex items-center gap-2">{icon}<span>{text}</span></div>
        <span className="font-mono text-muted-foreground">{fmt(e.created_at)}</span>
      </li>
    );
  };

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-2">
          <Clock className="h-3 w-3" /> مجريات المباراة ({events.length})
        </div>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">لسه مفيش أحداث...</p>
        ) : (
          <ul className="max-h-[300px] overflow-y-auto">{events.map(renderRow)}</ul>
        )}
      </CardContent>
    </Card>
  );
};
