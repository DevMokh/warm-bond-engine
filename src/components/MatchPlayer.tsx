import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Timer, Trophy, X, Check, Swords } from "lucide-react";
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
  winner_id: string | null;
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
  const [finished, setFinished] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const savedRef = useRef(false);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  useEffect(() => {
    correctRef.current = correct;
  }, [correct]);

  // Load match + questions
  useEffect(() => {
    if (!open || !matchId || !user) return;
    let cancelled = false;
    setLoading(true);
    setIndex(0);
    setScore(0);
    setCorrect(0);
    setSelected(null);
    setRevealed(false);
    setTimeLeft(TIMER);
    setFinished(false);
    setWaiting(false);
    savedRef.current = false;

    (async () => {
      const { data: m, error: me } = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .maybeSingle();
      if (cancelled) return;
      if (me || !m) {
        toast.error("فشل تحميل التحدي");
        setLoading(false);
        return;
      }
      const mm = m as MatchRow;
      setMatch(mm);

      // Check if current user already finished
      const already =
        (mm.challenger_id === user.id && mm.challenger_finished_at) ||
        (mm.opponent_id === user.id && mm.opponent_finished_at);
      if (already) {
        setFinished(true);
        setWaiting(!mm.winner_id);
        setLoading(false);
        return;
      }

      const ids = mm.question_ids || [];
      if (ids.length === 0) {
        toast.error("مفيش أسئلة في التحدي");
        setLoading(false);
        return;
      }
      const { data: qs, error: qe } = await supabase
        .from("questions")
        .select("id, question, options, correct_answer, difficulty")
        .in("id", ids);
      if (cancelled) return;
      if (qe || !qs) {
        toast.error("فشل تحميل الأسئلة");
        setLoading(false);
        return;
      }
      // Preserve original order from question_ids
      const byId = new Map(qs.map((q) => [q.id, q]));
      const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as unknown as Question[];
      setPool(ordered);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, matchId, user]);

  // Timer
  useEffect(() => {
    if (!open || loading || finished || revealed || !pool.length) return;
    if (timeLeft <= 0) {
      handleAnswer(-1);
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, open, loading, finished, revealed, pool.length]);

  const current = pool[index];

  const handleAnswer = (optIdx: number) => {
    if (revealed || !current) return;
    setSelected(optIdx);
    setRevealed(true);
    if (optIdx === current.correct_answer) {
      setCorrect((c) => c + 1);
      const bonus = current.difficulty === "hard" ? 30 : current.difficulty === "medium" ? 20 : 10;
      setScore((s) => s + bonus + Math.max(0, timeLeft));
    }
    setTimeout(() => nextQ(), 1200);
  };

  const nextQ = () => {
    if (index + 1 >= pool.length) {
      finishMatch();
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
    setTimeLeft(TIMER);
  };

  const finishMatch = async () => {
    if (savedRef.current || !match || !user) return;
    savedRef.current = true;
    setFinished(true);

    const isChallenger = match.challenger_id === user.id;
    const finalScore = scoreRef.current;
    const finalCorrect = correctRef.current;

    // 1) Save this player's score + finished_at
    const nowIso = new Date().toISOString();
    const updatePayload = isChallenger
      ? { challenger_score: finalScore, challenger_finished_at: nowIso }
      : { opponent_score: finalScore, opponent_finished_at: nowIso };

    const { error: uerr } = await supabase
      .from("matches")
      .update(updatePayload)
      .eq("id", match.id);
    if (uerr) {
      toast.error("فشل حفظ النتيجة");
      return;
    }

    // 2) Re-fetch latest and determine winner if both finished
    const { data: latest } = await supabase
      .from("matches")
      .select("*")
      .eq("id", match.id)
      .maybeSingle();
    if (!latest) return;
    const l = latest as MatchRow;

    if (l.challenger_finished_at && l.opponent_finished_at && !l.winner_id) {
      let winner: string | null = null;
      if (l.challenger_score > l.opponent_score) winner = l.challenger_id;
      else if (l.opponent_score > l.challenger_score) winner = l.opponent_id;
      // null = tie

      const { error: ferr } = await supabase
        .from("matches")
        .update({ winner_id: winner, status: "completed" })
        .eq("id", match.id);
      if (!ferr) {
        // Award XP to winner via game_sessions (solo insert, counts toward XP)
        if (winner) {
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
      }
      setMatch(l);
      setWaiting(false);
    } else {
      // Waiting for opponent
      setMatch(l);
      setWaiting(true);

      // also save my session
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

  // Realtime subscribe for opponent finishing
  useEffect(() => {
    if (!open || !match || !waiting) return;
    const channel = supabase
      .channel(`match-${match.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${match.id}` },
        (payload) => {
          const l = payload.new as MatchRow;
          setMatch(l);
          if (l.challenger_finished_at && l.opponent_finished_at) {
            setWaiting(false);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, match, waiting]);

  const handleClose = () => {
    onClose();
  };

  if (!open) return null;

  const total = pool.length;
  const progressPct = total > 0 ? ((index + (revealed ? 1 : 0)) / total) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
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
            onClose={handleClose}
          />
        ) : current ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="gap-1"><Swords className="h-3 w-3" /> 1v1</Badge>
                {match?.difficulty && <Badge variant="outline">{match.difficulty}</Badge>}
              </div>
              <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
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
            <Button className="mt-4" onClick={handleClose}>إغلاق</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const MatchResults = ({
  match,
  userId,
  waiting,
  myScore,
  onClose,
}: {
  match: MatchRow | null;
  userId: string;
  waiting: boolean;
  myScore: number;
  onClose: () => void;
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
    const oppFinishedAt = isChallenger ? match.opponent_finished_at : match.challenger_finished_at;
    const myFinishedAt = isChallenger ? match.challenger_finished_at : match.opponent_finished_at;

    return (
      <div className="py-8 text-center space-y-4">
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
            <CardContent className="p-4">
              {oppFinished ? (
                <>
                  <Check className="h-5 w-5 text-success mx-auto mb-1" />
                  <div className="text-2xl font-extrabold">{oppScore}</div>
                  <div className="text-[11px] text-muted-foreground">الخصم — خلّص</div>
                </>
              ) : (
                <>
                  <Loader2 className="h-5 w-5 text-warning mx-auto mb-1 animate-spin" />
                  <div className="text-2xl font-extrabold">—</div>
                  <div className="text-[11px] text-muted-foreground">الخصم — بيلعب</div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <WaitingTimer since={myFinishedAt} />

        <p className="text-xs text-muted-foreground">
          {oppFinished ? "بيتم احتساب الفائز الآن..." : "الشاشة بتتحدث تلقائياً لما الخصم يجاوب"}
        </p>
        <Button onClick={onClose} variant="outline">إغلاق</Button>
      </div>
    );
  }

  const won = match.winner_id === userId;
  const tie = !match.winner_id;
  const emoji = tie ? "🤝" : won ? "🏆" : "💔";
  const title = tie ? "تعادل!" : won ? "فزت!" : "خسرت";

  return (
    <div className="py-8 text-center space-y-5">
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
      <Button onClick={onClose} className="w-full max-w-xs">تمام</Button>
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
