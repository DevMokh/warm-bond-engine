import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Timer, Trophy, X, Check, Swords, RotateCcw, Clock, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Question = {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  difficulty: "easy" | "medium" | "hard";
};

type MatchRow = {
  id: string;
  challenger_id: string;
  opponent_id: string;
  category_id: string | null;
  question_ids: string[];
  questions_count: number;
  difficulty: "easy" | "medium" | "hard" | null;
  status: string;
  challenger_score: number;
  opponent_score: number;
  challenger_finished_at: string | null;
  opponent_finished_at: string | null;
  challenger_progress: number;
  opponent_progress: number;
  current_question_started_at: string | null;
  winner_id: string | null;
  created_at?: string;
};

type Props = {
  open: boolean;
  matchId: string | null;
  onClose: () => void;
  onFinished?: () => void;
};

const TIMER = 20;

export const MatchPlayer = ({ open, matchId, onClose, onFinished }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [pool, setPool] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const [questionStartAt, setQuestionStartAt] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [rematchSent, setRematchSent] = useState(false);
  const [rematchChecking, setRematchChecking] = useState(false);
  const [rematchEvents, setRematchEvents] = useState<{ at: string; label: string }[]>([]);
  const [rtError, setRtError] = useState<string | null>(null);
  const [rtNonce, setRtNonce] = useState(0);
  const savedRef = useRef(false);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const oppNotifiedRef = useRef(false);
  const oppProgressMaxRef = useRef(0);
  const rematchLockRef = useRef(false);

  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { correctRef.current = correct; }, [correct]);

  useEffect(() => {
    if (!open || !matchId || !user) return;
    let cancelled = false;
    setLoading(true);
    setIndex(0); setScore(0); setCorrect(0);
    setSelected(null); setRevealed(false);
    setTimeLeft(TIMER); setQuestionStartAt(null);
    setFinished(false); setWaiting(false);
    setRematchSent(false);
    savedRef.current = false;
    oppNotifiedRef.current = false;

    (async () => {
      const { data: m, error: me } = await supabase
        .from("matches").select("*").eq("id", matchId).maybeSingle();
      if (cancelled) return;
      if (me || !m) { toast.error("فشل تحميل التحدي"); setLoading(false); return; }
      const mm = m as MatchRow;
      setMatch(mm);

      const isCh = mm.challenger_id === user.id;
      const myProg = isCh ? mm.challenger_progress : mm.opponent_progress;
      const myFinished = isCh ? mm.challenger_finished_at : mm.opponent_finished_at;

      if (myFinished) {
        setFinished(true); setWaiting(!mm.winner_id); setLoading(false); return;
      }

      const ids = mm.question_ids || [];
      if (ids.length === 0) { toast.error("مفيش أسئلة في التحدي"); setLoading(false); return; }
      const { data: qs, error: qe } = await supabase
        .from("questions").select("id, question, options, correct_answer, difficulty").in("id", ids);
      if (cancelled) return;
      if (qe || !qs) { toast.error("فشل تحميل الأسئلة"); setLoading(false); return; }
      const byId = new Map(qs.map((q) => [q.id, q]));
      const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as unknown as Question[];
      setPool(ordered);
      setIndex(myProg || 0);
      // start timer with server timestamp for sync
      const startedAt = await markQuestionStart(mm.id);
      setQuestionStartAt(startedAt);
      setTimeLeft(TIMER);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [open, matchId, user]);

  // Server-synced per-question timer
  useEffect(() => {
    if (!open || loading || finished || revealed || !pool.length || questionStartAt == null) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - questionStartAt) / 1000);
      const left = Math.max(0, TIMER - elapsed);
      setTimeLeft(left);
      if (left <= 0) handleAnswer(-1);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionStartAt, open, loading, finished, revealed, pool.length]);

  const current = pool[index];

  // Records server time when this player begins a question; returns parsed local ms
  const markQuestionStart = async (mid: string): Promise<number> => {
    const nowIso = new Date().toISOString();
    await supabase.from("matches").update({ current_question_started_at: nowIso }).eq("id", mid);
    return new Date(nowIso).getTime();
  };

  const handleAnswer = (optIdx: number) => {
    if (revealed || !current || !match || !user) return;
    setSelected(optIdx);
    setRevealed(true);
    if (optIdx === current.correct_answer) {
      setCorrect((c) => c + 1);
      const bonus = current.difficulty === "hard" ? 30 : current.difficulty === "medium" ? 20 : 10;
      setScore((s) => s + bonus + Math.max(0, timeLeft));
    }
    // Save progress live so opponent sees it
    const newProgress = index + 1;
    const isCh = match.challenger_id === user.id;
    supabase.from("matches").update(
      isCh ? { challenger_progress: newProgress } : { opponent_progress: newProgress }
    ).eq("id", match.id);

    setTimeout(() => nextQ(), 1200);
  };

  const nextQ = async () => {
    if (index + 1 >= pool.length) { finishMatch(); return; }
    setIndex((i) => i + 1);
    setSelected(null); setRevealed(false);
    if (match) {
      const startedAt = await markQuestionStart(match.id);
      setQuestionStartAt(startedAt);
    }
    setTimeLeft(TIMER);
  };

  const finishMatch = async () => {
    if (savedRef.current || !match || !user) return;
    savedRef.current = true;
    setFinished(true);

    const isChallenger = match.challenger_id === user.id;
    const finalScore = scoreRef.current;
    const finalCorrect = correctRef.current;

    const nowIso = new Date().toISOString();
    const updatePayload = isChallenger
      ? { challenger_score: finalScore, challenger_finished_at: nowIso, challenger_progress: pool.length }
      : { opponent_score: finalScore, opponent_finished_at: nowIso, opponent_progress: pool.length };

    const { error: uerr } = await supabase.from("matches").update(updatePayload).eq("id", match.id);
    if (uerr) { toast.error("فشل حفظ النتيجة"); return; }

    const { data: latest } = await supabase.from("matches").select("*").eq("id", match.id).maybeSingle();
    if (!latest) return;
    const l = latest as MatchRow;

    if (l.challenger_finished_at && l.opponent_finished_at && !l.winner_id) {
      let winner: string | null = null;
      if (l.challenger_score > l.opponent_score) winner = l.challenger_id;
      else if (l.opponent_score > l.challenger_score) winner = l.opponent_id;

      const { error: ferr } = await supabase
        .from("matches").update({ winner_id: winner, status: "completed" }).eq("id", match.id);
      if (!ferr && winner) {
        await supabase.from("game_sessions").insert({
          user_id: winner,
          mode: "multiplayer",
          category_id: match.category_id ?? null,
          difficulty: match.difficulty ?? "medium",
          score: winner === l.challenger_id ? l.challenger_score : l.opponent_score,
          correct_answers: finalCorrect,
          total_questions: pool.length,
          xp_earned: 100,
          duration_seconds: null,
        });
      }
      setMatch({ ...l, winner_id: winner, status: "completed" });
      setWaiting(false);
    } else {
      setMatch(l);
      setWaiting(true);
      await supabase.from("game_sessions").insert({
        user_id: user.id,
        mode: "multiplayer",
        category_id: match.category_id ?? null,
        difficulty: match.difficulty ?? "medium",
        score: finalScore,
        correct_answers: finalCorrect,
        total_questions: pool.length,
        xp_earned: Math.floor(finalScore / 2),
        duration_seconds: null,
      });
    }
    onFinished?.();
  };

  // Realtime
  useEffect(() => {
    if (!open || !match || !user) return;
    const channel = supabase
      .channel(`match-${match.id}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${match.id}` },
        (payload) => {
          const l = payload.new as MatchRow;
          const isCh = l.challenger_id === user.id;
          const oppFinishedNow = isCh ? !!l.opponent_finished_at : !!l.challenger_finished_at;
          const oppFinishedBefore = match ? (isCh ? !!match.opponent_finished_at : !!match.challenger_finished_at) : false;
          if (oppFinishedNow && !oppFinishedBefore && !oppNotifiedRef.current) {
            oppNotifiedRef.current = true;
            const oppScore = isCh ? l.opponent_score : l.challenger_score;
            toast.success(`الخصم خلّص! نتيجته ${oppScore}`, { description: "بيتم احتساب الفائز..." });
          }
          setMatch(l);
          if (l.challenger_finished_at && l.opponent_finished_at) setWaiting(false);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, match?.id, user?.id]);

  const inProgress = !finished && !loading && pool.length > 0;
  const tryClose = () => {
    if (inProgress) {
      if (!window.confirm("لو خرجت دلوقتي هتخسر تقدمك في المباراة. متأكد؟")) return;
    } else if (waiting) {
      if (!window.confirm("نتيجتك اتسجلت. تقفل النافذة وتستنى احتساب الفائز في الخلفية؟")) return;
    }
    onClose();
  };

  // Check if a pending rematch from me to same opponent already exists + realtime sync
  useEffect(() => {
    if (!finished || !match || !user) return;
    let cancelled = false;
    const opponentId = match.challenger_id === user.id ? match.opponent_id : match.challenger_id;
    const baseTime = match.created_at ?? new Date(0).toISOString();

    const recheck = async () => {
      setRematchChecking(true);
      const { data } = await supabase
        .from("matches")
        .select("id, status")
        .eq("challenger_id", user.id)
        .eq("opponent_id", opponentId)
        .eq("status", "pending")
        .gt("created_at", baseTime)
        .limit(1);
      if (!cancelled) setRematchSent((data ?? []).length > 0);
      setRematchChecking(false);
    };
    recheck();

    // Realtime: any new/updated match between us flips the rematch button state
    const channel = supabase
      .channel(`rematch-${match.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, (payload) => {
        const row = (payload.new ?? payload.old) as Partial<MatchRow> | null;
        if (!row) return;
        const involves =
          (row.challenger_id === user.id && row.opponent_id === opponentId) ||
          (row.challenger_id === opponentId && row.opponent_id === user.id);
        if (involves) recheck();
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [finished, match?.id, user?.id]);

  const rematch = async () => {
    if (!match || !user || rematchSent) return;
    setRematchSent(true);
    const opponentId = match.challenger_id === user.id ? match.opponent_id : match.challenger_id;

    // Re-check to prevent double-send race
    const { data: existing } = await supabase
      .from("matches").select("id")
      .eq("challenger_id", user.id)
      .eq("opponent_id", opponentId)
      .eq("status", "pending")
      .limit(1);
    if (existing && existing.length > 0) {
      toast.info("بعت تحدي إعادة قبل كده، استنى رد الخصم");
      onClose();
      return;
    }

    let qids = match.question_ids;
    if (match.category_id && match.difficulty) {
      const { data: qs } = await supabase
        .from("questions").select("id")
        .eq("category_id", match.category_id)
        .eq("difficulty", match.difficulty)
        .eq("is_active", true)
        .limit(match.questions_count * 3);
      if (qs && qs.length >= match.questions_count) {
        qids = qs.sort(() => Math.random() - 0.5).slice(0, match.questions_count).map((q) => q.id);
      }
    }
    const { error } = await supabase.from("matches").insert({
      challenger_id: user.id,
      opponent_id: opponentId,
      category_id: match.category_id,
      difficulty: match.difficulty,
      questions_count: match.questions_count,
      question_ids: qids,
      status: "pending",
    });
    if (error) { toast.error("فشل إرسال إعادة المباراة"); setRematchSent(false); }
    else { toast.success("اتبعت تحدي إعادة ⚔️"); onFinished?.(); onClose(); }
  };

  if (!open) return null;

  const total = pool.length;
  const progressPct = total > 0 ? ((index + (revealed ? 1 : 0)) / total) * 100 : 0;

  // Opponent live progress
  const isChallenger = match ? match.challenger_id === user?.id : false;
  const oppProgress = match ? (isChallenger ? match.opponent_progress : match.challenger_progress) : 0;
  const oppFinishedLive = match ? !!(isChallenger ? match.opponent_finished_at : match.challenger_finished_at) : false;
  const oppPct = total > 0 ? Math.min(100, (oppProgress / total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && tryClose()}>
      <DialogContent
        className="!top-0 !left-0 !translate-x-0 !translate-y-0 sm:!top-[50%] sm:!left-[50%] sm:!translate-x-[-50%] sm:!translate-y-[-50%] w-screen h-[100dvh] max-w-none sm:max-w-2xl sm:h-auto sm:max-h-[92vh] overflow-y-auto rounded-none sm:rounded-lg p-4 sm:p-6"
        style={{
          paddingTop: "max(1rem, env(safe-area-inset-top))",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          paddingLeft: "max(1rem, env(safe-area-inset-left))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">جاري تحميل التحدي...</p>
          </div>
        ) : finished ? (
          <MatchResults
            match={match}
            userId={user?.id || ""}
            waiting={waiting}
            myScore={scoreRef.current}
            myCorrect={correctRef.current}
            totalQs={pool.length || match?.questions_count || 0}
            onClose={onClose}
            onRematch={rematch}
            rematchSent={rematchSent}
            rematchChecking={rematchChecking}
          />
        ) : current ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="gap-1"><Swords className="h-3 w-3" /> 1v1</Badge>
                {match?.difficulty && <Badge variant="outline">{match.difficulty}</Badge>}
                <Badge variant="secondary">سؤال {index + 1} من {total}</Badge>
              </div>
              <button onClick={tryClose} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className="font-bold">{index + 1} / {total}</span>
                <span className="text-primary font-bold">⭐ {score}</span>
              </div>
              <div className={cn("flex items-center gap-1 font-bold", timeLeft <= 3 && "text-destructive animate-pulse")}>
                <Timer className="h-4 w-4" />
                {timeLeft}s
              </div>
            </div>

            <Progress value={progressPct} className="h-1.5" />
            <Progress value={(timeLeft / TIMER) * 100} className={cn("h-1", timeLeft <= 3 && "[&>div]:bg-destructive")} />

            {/* Opponent live progress */}
            <div className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 font-bold text-muted-foreground">
                  <Activity className="h-3 w-3" /> تقدم الخصم
                </span>
                <span className="font-mono">
                  {oppFinishedLive ? "خلّص ✅" : `${Math.round(oppPct)}% · سؤال ${oppProgress} من ${total}`}
                </span>
              </div>
              <Progress value={oppFinishedLive ? 100 : oppPct} className="h-1.5 [&>div]:bg-warning [&>div]:transition-all [&>div]:duration-500" />
            </div>

            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-5 md:p-6">
                <h2 className="text-lg md:text-xl font-bold leading-relaxed">{current.question}</h2>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-2.5">
              {current.options.map((opt, i) => {
                const isCorrect = i === current.correct_answer;
                const isSelected = selected === i;
                const showCorrect = revealed && isCorrect;
                const showWrong = revealed && isSelected && !isCorrect;
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={revealed}
                    className={cn(
                      "text-right p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-3",
                      "hover:border-primary/50 hover:bg-primary/5",
                      !revealed && "border-border bg-card",
                      showCorrect && "border-success bg-success/10 text-success",
                      showWrong && "border-destructive bg-destructive/10 text-destructive",
                      revealed && !isCorrect && !isSelected && "opacity-50",
                    )}
                  >
                    <span className="font-medium">{opt}</span>
                    {showCorrect && <Check className="h-5 w-5 shrink-0" />}
                    {showWrong && <X className="h-5 w-5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">لا توجد أسئلة</p>
            <Button className="mt-4" onClick={onClose}>إغلاق</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const fmtTime = (iso: string | null | undefined) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch { return "—"; }
};

const EventLog = ({ match, userId, tieNote }: { match: MatchRow; userId: string; tieNote?: string }) => {
  const isChallenger = match.challenger_id === userId;
  const myFinish = isChallenger ? match.challenger_finished_at : match.opponent_finished_at;
  const oppFinish = isChallenger ? match.opponent_finished_at : match.challenger_finished_at;
  const myScore = isChallenger ? match.challenger_score : match.opponent_score;
  const oppScore = isChallenger ? match.opponent_score : match.challenger_score;

  const events: { time: string | null | undefined; label: string }[] = [
    { time: match.created_at, label: "🎬 بدأت المباراة" },
    { time: myFinish, label: `✅ خلصت أنت (نتيجتك ${myScore})` },
    { time: oppFinish, label: `✅ خلّص الخصم (نتيجته ${oppScore})` },
  ];
  if (match.challenger_finished_at && match.opponent_finished_at) {
    const wonByMe = match.winner_id === userId;
    const isTie = !match.winner_id;
    const wlbl = isTie
      ? `🤝 تعادل — نفس النتيجة (${myScore} = ${oppScore})`
      : wonByMe
        ? `🏆 احتُسبت لك (${myScore} > ${oppScore})`
        : `💔 فاز الخصم (${oppScore} > ${myScore})`;
    events.push({ time: oppFinish && myFinish ? (new Date(oppFinish) > new Date(myFinish) ? oppFinish : myFinish) : null, label: wlbl });
  }

  return (
    <Card className="text-right">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
          <Clock className="h-3 w-3" /> سجل الأحداث
        </div>
        <ul className="space-y-1.5">
          {events.map((e, i) => (
            <li key={i} className="flex items-center justify-between gap-3 text-xs">
              <span>{e.label}</span>
              <span className="font-mono text-muted-foreground">{fmtTime(e.time)}</span>
            </li>
          ))}
        </ul>
        {tieNote && (
          <div className="mt-2 pt-2 border-t border-border text-[11px] text-muted-foreground leading-relaxed">
            {tieNote}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const MatchResults = ({
  match, userId, waiting, myScore, myCorrect, totalQs, onClose, onRematch, rematchSent, rematchChecking,
}: {
  match: MatchRow | null;
  userId: string;
  waiting: boolean;
  myScore: number;
  myCorrect: number;
  totalQs: number;
  onClose: () => void;
  onRematch: () => void;
  rematchSent: boolean;
  rematchChecking: boolean;
}) => {
  if (!match) {
    return (
      <div className="py-12 text-center space-y-4">
        <p>النتيجة غير متاحة</p>
        <Button onClick={onClose}>إغلاق</Button>
      </div>
    );
  }
  const isChallenger = match.challenger_id === userId;
  const mine = isChallenger ? match.challenger_score : match.opponent_score;
  const opp = isChallenger ? match.opponent_score : match.challenger_score;
  const both = match.challenger_finished_at && match.opponent_finished_at;

  if (waiting || !both) {
    const oppFinished = isChallenger ? !!match.opponent_finished_at : !!match.challenger_finished_at;
    const oppScore = isChallenger ? match.opponent_score : match.challenger_score;
    const oppProgress = isChallenger ? match.opponent_progress : match.challenger_progress;
    const myFinishedAt = isChallenger ? match.challenger_finished_at : match.opponent_finished_at;
    const oppPct = totalQs > 0 ? Math.min(100, (oppProgress / totalQs) * 100) : 0;

    return (
      <div className="py-6 text-center space-y-4">
        <div className="text-5xl animate-pulse">⏳</div>
        <h2 className="text-xl font-extrabold">خلصت! في انتظار الخصم</h2>

        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          <Card className="border-success/40 bg-success/5">
            <CardContent className="p-4">
              <Check className="h-5 w-5 text-success mx-auto mb-1" />
              <div className="text-2xl font-extrabold">{myScore}</div>
              <div className="text-[11px] text-muted-foreground">أنت — خلصت</div>
            </CardContent>
          </Card>
          <Card className={cn(oppFinished ? "border-success/40 bg-success/5" : "border-warning/40 bg-warning/5")}>
            <CardContent className="p-4 space-y-1.5">
              {oppFinished ? (
                <>
                  <Check className="h-5 w-5 text-success mx-auto mb-1" />
                  <div className="text-2xl font-extrabold">{oppScore}</div>
                  <div className="text-[11px] text-muted-foreground">الخصم — خلّص</div>
                </>
              ) : (
                <>
                  <Loader2 className="h-5 w-5 text-warning mx-auto mb-1 animate-spin" />
                  <div className="text-lg font-extrabold">{Math.round(oppPct)}%</div>
                  <div className="text-[11px] text-muted-foreground">سؤال {oppProgress} من {totalQs}</div>
                  <Progress value={oppPct} className="h-1.5 [&>div]:bg-warning [&>div]:transition-all [&>div]:duration-500" />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <WaitingTimer since={myFinishedAt} />
        <EventLog match={match} userId={userId} />

        <p className="text-xs text-muted-foreground">
          {oppFinished ? "بيتم احتساب الفائز الآن..." : "الشاشة بتتحدث تلقائياً مع كل سؤال يجاوبه الخصم"}
        </p>
        <Button onClick={onClose} variant="outline">إغلاق</Button>
      </div>
    );
  }

  const won = match.winner_id === userId;
  const tie = !match.winner_id;
  const emoji = tie ? "🤝" : won ? "🏆" : "💔";
  const title = tie ? "تعادل!" : won ? "فزت!" : "خسرت";

  const tieNote = tie
    ? `الاحتساب: نتيجتك (${mine}) = نتيجة الخصم (${opp}). إجاباتك الصحيحة: ${myCorrect}/${totalQs}. النقاط بتتحسب: 10/20/30 حسب الصعوبة + الثواني المتبقية لكل سؤال صح. بما إن المجموع متساوي، النتيجة تعادل ومفيش XP.`
    : undefined;

  return (
    <div className="py-6 text-center space-y-4">
      <div className="text-6xl">{emoji}</div>
      <h2 className="text-2xl font-extrabold">{title}</h2>
      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
        <Card className={cn(won && "border-success bg-success/5")}>
          <CardContent className="p-4">
            <Trophy className="h-5 w-5 text-primary mx-auto mb-1" />
            <div className="text-2xl font-extrabold">{mine}</div>
            <div className="text-[11px] text-muted-foreground">أنت</div>
          </CardContent>
        </Card>
        <Card className={cn(!won && !tie && "border-destructive bg-destructive/5")}>
          <CardContent className="p-4">
            <Swords className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
            <div className="text-2xl font-extrabold">{opp}</div>
            <div className="text-[11px] text-muted-foreground">الخصم</div>
          </CardContent>
        </Card>
      </div>
      {won && <p className="text-sm text-success">+100 XP 🎉</p>}
      {tie && (
        <Card className="border-warning/40 bg-warning/5 text-right max-w-md mx-auto">
          <CardContent className="p-3 text-xs leading-relaxed">{tieNote}</CardContent>
        </Card>
      )}

      <EventLog match={match} userId={userId} tieNote={tie ? tieNote : undefined} />

      <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
        <Button onClick={onRematch} disabled={rematchSent || rematchChecking} className="flex-1 gap-2">
          <RotateCcw className="h-4 w-4" />
          {rematchSent ? "في انتظار رد الخصم" : "إعادة المباراة"}
        </Button>
        <Button onClick={onClose} variant="outline" className="flex-1">تمام</Button>
      </div>
    </div>
  );
};

const WaitingTimer = ({ since }: { since: string | null }) => {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!since) return;
    const start = new Date(since).getTime();
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [since]);
  if (!since) return null;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm font-mono">
      <Timer className="h-4 w-4 text-muted-foreground" />
      <span>وقت الانتظار: {mm}:{ss}</span>
    </div>
  );
};
