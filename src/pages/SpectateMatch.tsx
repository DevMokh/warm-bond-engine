import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Eye, Maximize2, Minimize2, Activity, Timer, ArrowLeft } from "lucide-react";
import { useFullscreen } from "@/hooks/useFullscreen";
import { MatchTimeline, MatchEvent } from "@/components/MatchTimeline";
import { SeriesProgress } from "@/components/SeriesProgress";
import { cn } from "@/lib/utils";

const TIMER = 20;

type MatchRow = {
  id: string; challenger_id: string; opponent_id: string;
  questions_count: number; question_ids: string[];
  status: string;
  challenger_score: number; opponent_score: number;
  challenger_progress: number; opponent_progress: number;
  challenger_finished_at: string | null; opponent_finished_at: string | null;
  current_question_started_at: string | null; winner_id: string | null;
  is_public_spectate: boolean; series_id: string | null; round_number: number; best_of: number;
};

type Profile = { user_id: string; display_name: string | null; username: string | null; avatar_url: string | null };

export default function SpectateMatch() {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [seriesMatches, setSeriesMatches] = useState<MatchRow[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const { ref, isFullscreen, toggle } = useFullscreen();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.from("matches").select("*").eq("id", id).maybeSingle();
      if (cancelled) return;
      if (error || !data) { setDenied(true); setLoading(false); return; }
      setMatch(data as MatchRow);
      // Load full series for Best-of-N progress
      if (data.series_id) {
        const { data: ser } = await supabase.from("matches").select("*").eq("series_id", data.series_id).order("round_number", { ascending: true });
        if (!cancelled && ser) setSeriesMatches(ser as MatchRow[]);
      } else {
        setSeriesMatches([data as MatchRow]);
      }
      const { data: ev } = await supabase.from("match_events").select("*").eq("match_id", id).order("created_at", { ascending: true });
      if (!cancelled && ev) setEvents(ev as MatchEvent[]);
      const ids = [data.challenger_id, data.opponent_id];
      const { data: pr } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", ids);
      if (!cancelled && pr) {
        const map: Record<string, Profile> = {};
        pr.forEach((p) => (map[p.user_id] = p as Profile));
        setProfiles(map);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Realtime
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`spec-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${id}` },
        async (p) => {
          const newM = p.new as MatchRow;
          setMatch(newM);
          if (newM.series_id) {
            const { data: ser } = await supabase.from("matches").select("*").eq("series_id", newM.series_id).order("round_number", { ascending: true });
            if (ser) setSeriesMatches(ser as MatchRow[]);
          }
        })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "match_events", filter: `match_id=eq.${id}` },
        (p) => setEvents((e) => [...e, p.new as MatchEvent]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  // tick for timer display
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const timeLeft = useMemo(() => {
    if (!match?.current_question_started_at) return TIMER;
    const elapsed = Math.floor((now - new Date(match.current_question_started_at).getTime()) / 1000);
    return Math.max(0, TIMER - elapsed);
  }, [match?.current_question_started_at, now]);

  if (loading) return <div className="py-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (denied || !match) return (
    <div className="py-16 text-center space-y-3">
      <p className="text-muted-foreground">المباراة دي مش متاحة للمتابعة العامة</p>
      <Button asChild variant="outline"><Link to="/matches"><ArrowLeft className="h-4 w-4" />رجوع</Link></Button>
    </div>
  );

  const total = match.questions_count;
  const cName = profiles[match.challenger_id]?.display_name || profiles[match.challenger_id]?.username || "اللاعب 1";
  const oName = profiles[match.opponent_id]?.display_name || profiles[match.opponent_id]?.username || "اللاعب 2";
  const cPct = total > 0 ? Math.min(100, (match.challenger_progress / total) * 100) : 0;
  const oPct = total > 0 ? Math.min(100, (match.opponent_progress / total) * 100) : 0;

  return (
    <div ref={ref} className="bg-background min-h-[100svh] p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="gap-1"><Eye className="h-3 w-3" /> متفرّج</Badge>
            {match.best_of > 1 && <Badge variant="outline">جولة {match.round_number} من {match.best_of}</Badge>}
            <Badge variant="outline">{match.status}</Badge>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={toggle} className="h-8 w-8" aria-label="ملء الشاشة">
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="ghost" asChild><Link to="/matches"><ArrowLeft className="h-4 w-4" /></Link></Button>
          </div>
        </div>

        {/* Live timer */}
        {match.status === "active" && match.current_question_started_at && (
          <div className={cn("flex items-center justify-center gap-2 font-bold text-lg", timeLeft <= 3 && "text-destructive animate-pulse")}>
            <Timer className="h-5 w-5" /> {timeLeft}s
          </div>
        )}

        {/* Players */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: cName, score: match.challenger_score, prog: match.challenger_progress, pct: cPct, finished: !!match.challenger_finished_at, winner: match.winner_id === match.challenger_id },
            { name: oName, score: match.opponent_score, prog: match.opponent_progress, pct: oPct, finished: !!match.opponent_finished_at, winner: match.winner_id === match.opponent_id },
          ].map((p, i) => (
            <Card key={i} className={cn(p.winner && "border-success ring-2 ring-success/40")}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold truncate">{p.name}</span>
                  {p.finished && <Badge variant="outline" className="text-[10px]">خلّص</Badge>}
                </div>
                <div className="text-2xl font-extrabold text-primary">{p.score}</div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> {p.prog}/{total}</span>
                  <span>{Math.round(p.pct)}%</span>
                </div>
                <Progress value={p.finished ? 100 : p.pct} className="h-1.5" />
              </CardContent>
            </Card>
          ))}
        </div>

        <MatchTimeline events={events} challengerName={cName} opponentName={oName} challengerId={match.challenger_id} />
      </div>
    </div>
  );
}
