import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Play, Pause, FastForward, RotateCcw, ArrowLeft, Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useGameSounds } from "@/hooks/useGameSounds";
import { MatchTimeline, MatchEvent } from "@/components/MatchTimeline";
import { SeriesProgress } from "@/components/SeriesProgress";
import { SfxIndicator } from "@/components/SfxIndicator";
import { PlayersCompare } from "@/components/PlayersCompare";
import type { SfxKind } from "@/hooks/useGameSounds";

type MatchRow = {
  id: string; challenger_id: string; opponent_id: string;
  series_id: string | null; round_number: number; best_of: number;
  questions_count: number;
  challenger_score: number; opponent_score: number; winner_id: string | null;
};
type Profile = { user_id: string; display_name: string | null; username: string | null };

export default function ReplayMatch() {
  const { id } = useParams<{ id: string }>();
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [allEvents, setAllEvents] = useState<MatchEvent[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [cursor, setCursor] = useState(0); // index of next event to reveal
  const startRef = useRef<number | null>(null);
  const baseRef = useRef<number>(0);
  const { ref, isFullscreen, toggle } = useFullscreen();
  const { muted, setMuted, play } = useGameSounds();
  const lastPlayedIdxRef = useRef(0);
  const [lastSfx, setLastSfx] = useState<SfxKind | null>(null);
  const [lastSfxTs, setLastSfxTs] = useState(0);
  useEffect(() => {
    if (cursor > lastPlayedIdxRef.current) {
      const ev = allEvents[cursor - 1];
      let kind: SfxKind | null = null;
      if (ev?.event_type === "answer") {
        const correct = (ev as unknown as { is_correct?: boolean }).is_correct;
        kind = correct ? "correct" : "wrong";
      } else if (ev) kind = "tick";
      if (kind) { play(kind); setLastSfx(kind); setLastSfxTs(Date.now()); }
    }
    lastPlayedIdxRef.current = cursor;
  }, [cursor, allEvents, play]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: m } = await supabase.from("matches").select("*").eq("id", id).maybeSingle();
      if (cancelled || !m) { setLoading(false); return; }
      let series: MatchRow[] = [m as MatchRow];
      if (m.series_id) {
        const { data: all } = await supabase.from("matches").select("*").eq("series_id", m.series_id).order("round_number", { ascending: true });
        if (all) series = all as MatchRow[];
      }
      setMatches(series);
      const ids = series.map((s) => s.id);
      const { data: ev } = await supabase.from("match_events").select("*").in("match_id", ids).order("created_at", { ascending: true });
      if (!cancelled && ev) setAllEvents(ev as MatchEvent[]);
      const userIds = Array.from(new Set(series.flatMap((s) => [s.challenger_id, s.opponent_id])));
      const { data: pr } = await supabase.from("profiles").select("user_id, display_name, username").in("user_id", userIds);
      if (!cancelled && pr) {
        const map: Record<string, Profile> = {};
        pr.forEach((p) => (map[p.user_id] = p as Profile));
        setProfiles(map);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const baseTime = allEvents[0] ? new Date(allEvents[0].created_at).getTime() : 0;
  const totalDur = allEvents.length > 0 ? new Date(allEvents[allEvents.length - 1].created_at).getTime() - baseTime : 0;

  // playback loop
  useEffect(() => {
    if (!playing || allEvents.length === 0) return;
    let raf = 0;
    startRef.current = performance.now();
    const startCursor = cursor;
    const tick = () => {
      const elapsed = (performance.now() - (startRef.current ?? 0)) * speed + baseRef.current;
      let next = startCursor;
      while (next < allEvents.length) {
        const t = new Date(allEvents[next].created_at).getTime() - baseTime;
        if (t <= elapsed) next++;
        else break;
      }
      setCursor(next);
      if (next >= allEvents.length) { setPlaying(false); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      const el = (performance.now() - (startRef.current ?? 0)) * speed + baseRef.current;
      baseRef.current = Math.min(el, totalDur);
    };
  }, [playing, speed, allEvents.length]);

  const reset = () => { setPlaying(false); setCursor(0); baseRef.current = 0; };

  const visibleEvents = allEvents.slice(0, cursor);
  const progress = allEvents.length > 0 ? (cursor / allEvents.length) * 100 : 0;

  const cName = useMemo(() => matches[0] ? (profiles[matches[0].challenger_id]?.display_name || "اللاعب 1") : "اللاعب 1", [matches, profiles]);
  const oName = useMemo(() => matches[0] ? (profiles[matches[0].opponent_id]?.display_name || "اللاعب 2") : "اللاعب 2", [matches, profiles]);

  // Aggregate series score from matches list
  const seriesScore = matches.reduce(
    (acc, m) => {
      if (m.winner_id === m.challenger_id) acc.c++;
      else if (m.winner_id === m.opponent_id) acc.o++;
      return acc;
    },
    { c: 0, o: 0 },
  );

  if (loading) return <div className="py-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (matches.length === 0) return (
    <div className="py-16 text-center space-y-3">
      <p>المباراة مش موجودة</p>
      <Button asChild variant="outline"><Link to="/matches"><ArrowLeft className="h-4 w-4" />رجوع</Link></Button>
    </div>
  );

  return (
    <div ref={ref} className="bg-background min-h-[100svh] p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="gap-1"><Play className="h-3 w-3" /> إعادة العرض</Badge>
            {matches[0]?.best_of > 1 && <Badge variant="outline">Best-of-{matches[0].best_of}</Badge>}
            <SfxIndicator kind={lastSfx} muted={muted} ts={lastSfxTs} />
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={() => setMuted(!muted)} className="h-8 w-8" title={muted ? "تشغيل الصوت" : "كتم الصوت"} aria-label="صوت">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={toggle} className="h-8 w-8">
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="ghost" asChild><Link to="/matches"><ArrowLeft className="h-4 w-4" /></Link></Button>
          </div>
        </div>

        {/* Series scoreboard with progress */}
        {matches[0]?.best_of > 1 ? (
          <SeriesProgress
            bestOf={matches[0].best_of}
            challengerWins={seriesScore.c}
            opponentWins={seriesScore.o}
            challengerName={cName}
            opponentName={oName}
          />
        ) : (
          <Card>
            <CardContent className="p-4 grid grid-cols-3 items-center gap-2 text-center">
              <div>
                <div className="text-xs text-muted-foreground truncate">{cName}</div>
                <div className="text-3xl font-extrabold text-primary">{matches[0]?.challenger_score ?? 0}</div>
              </div>
              <div className="text-xs text-muted-foreground">النتيجة</div>
              <div>
                <div className="text-xs text-muted-foreground truncate">{oName}</div>
                <div className="text-3xl font-extrabold text-primary">{matches[0]?.opponent_score ?? 0}</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Controls */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <Progress value={progress} className="h-1.5" />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setPlaying((p) => !p)} disabled={cursor >= allEvents.length}>
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {playing ? "وقف" : "تشغيل"}
                </Button>
                <Button size="sm" variant="outline" onClick={reset}><RotateCcw className="h-4 w-4" /> من الأول</Button>
              </div>
              <div className="flex gap-1 items-center">
                <FastForward className="h-3.5 w-3.5 text-muted-foreground" />
                {([1, 2, 4] as const).map((s) => (
                  <Button key={s} size="sm" variant={speed === s ? "default" : "outline"}
                    onClick={() => { baseRef.current = ((performance.now() - (startRef.current ?? performance.now())) * speed) + baseRef.current; setSpeed(s); startRef.current = performance.now(); }}
                    className="h-7 px-2 text-xs">{s}x</Button>
                ))}
              </div>
              <Badge variant="outline" className="text-xs">{cursor}/{allEvents.length}</Badge>
            </div>
          </CardContent>
        </Card>

        <MatchTimeline
          events={visibleEvents}
          challengerName={cName}
          opponentName={oName}
          challengerId={matches[0]?.challenger_id}
          highlightLastId={visibleEvents[visibleEvents.length - 1]?.id}
        />
      </div>
    </div>
  );
}
