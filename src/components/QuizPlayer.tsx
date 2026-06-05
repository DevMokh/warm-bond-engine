import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { Progress } from "@/components/ui/progress";
import { Loader2, Heart, Timer, Trophy, X, Check, RotateCw, Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useGameSounds } from "@/hooks/useGameSounds";
import { useProfileStats } from "@/hooks/useProfileStats";
import { PlayerHud } from "./PlayerHud";
import { MatchSplash } from "./MatchSplash";

export type ModeConfig = {
  id: string;
  title: string;
  questionCount: number; // 0 = endless
  difficulty: "easy" | "medium" | "hard" | "mixed" | "ascend";
  timerSeconds: number; // 0 = no timer
  lives: number; // 0 = unlimited
  showExplanation: boolean;
};

export const MODE_CONFIGS: Record<string, ModeConfig> = {
  classic:    { id: "classic",  title: "كلاسيكي", questionCount: 10, difficulty: "mixed",  timerSeconds: 20, lives: 0, showExplanation: false },
  blitz:      { id: "blitz",    title: "البرق",   questionCount: 10, difficulty: "mixed",  timerSeconds: 7,  lives: 0, showExplanation: false },
  hearts:     { id: "hearts",   title: "القلوب",  questionCount: 15, difficulty: "mixed",  timerSeconds: 15, lives: 3, showExplanation: false },
  endless:    { id: "endless",  title: "لا نهاية", questionCount: 0,  difficulty: "mixed",  timerSeconds: 15, lives: 1, showExplanation: false },
  perfect:    { id: "perfect",  title: "الكمال",  questionCount: 10, difficulty: "hard",   timerSeconds: 20, lives: 1, showExplanation: false },
  ascend:     { id: "ascend",   title: "التصاعد", questionCount: 12, difficulty: "ascend", timerSeconds: 20, lives: 0, showExplanation: false },
  "one-shot": { id: "one-shot", title: "ضربة واحدة", questionCount: 10, difficulty: "mixed", timerSeconds: 15, lives: 1, showExplanation: false },
  memory:     { id: "memory",   title: "الذاكرة", questionCount: 10, difficulty: "mixed",  timerSeconds: 5,  lives: 0, showExplanation: false },
  "easy-5":   { id: "easy-5",   title: "سهل",     questionCount: 5,  difficulty: "easy",   timerSeconds: 30, lives: 0, showExplanation: true },
  "hard-15":  { id: "hard-15",  title: "صعب",     questionCount: 15, difficulty: "hard",   timerSeconds: 15, lives: 0, showExplanation: false },
  study:      { id: "study",    title: "مذاكرة",  questionCount: 10, difficulty: "mixed",  timerSeconds: 0,  lives: 0, showExplanation: true },
  marathon:   { id: "marathon", title: "ماراثون", questionCount: 20, difficulty: "mixed",  timerSeconds: 20, lives: 0, showExplanation: false },
};

type Question = {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  difficulty: "easy" | "medium" | "hard";
  explanation: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  modeId: string;
  categoryId: string;
  categoryTitle: string;
  branchTitle: string;
};

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const QuizPlayer = ({ open, onClose, modeId, categoryId, categoryTitle, branchTitle }: Props) => {
  const { user } = useAuth();
  const config = MODE_CONFIGS[modeId];
  const [loading, setLoading] = useState(true);
  const [pool, setPool] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [livesLeft, setLivesLeft] = useState(config?.lives || 0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(config?.timerSeconds || 0);
  const [finished, setFinished] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const sessionSavedRef = useRef(false);
  const { ref: fsRef, isFullscreen, toggle: toggleFs } = useFullscreen<HTMLDivElement>({ autoOnFirstGesture: true });
  const { muted, setMuted, play } = useGameSounds();
  const { awardGame } = useProfileStats();
  const [splashDone, setSplashDone] = useState(false);



  // SFX on reveal / finish
  useEffect(() => {
    if (!revealed || !pool[index]) return;
    const isCorrect = selected === pool[index].correct_answer;
    play(isCorrect ? "correct" : "wrong");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);
  useEffect(() => { if (finished) play(correctCount / Math.max(1, index + 1) >= 0.5 ? "win" : "lose"); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  // Load questions
  useEffect(() => {
    if (!open || !config) return;
    let cancelled = false;
    setLoading(true);
    setIndex(0);
    setScore(0);
    setCorrectCount(0);
    setLivesLeft(config.lives);
    setSelected(null);
    setRevealed(false);
    setFinished(false);
    setTimeLeft(config.timerSeconds);
    startTimeRef.current = Date.now();
    sessionSavedRef.current = false;
    setSplashDone(false);



    (async () => {
      let query = supabase
        .from("questions")
        .select("id, question, options, correct_answer, difficulty, explanation")
        .eq("category_id", categoryId)
        .eq("is_active", true);

      if (config.difficulty === "easy" || config.difficulty === "medium" || config.difficulty === "hard") {
        query = query.eq("difficulty", config.difficulty);
      }

      const { data, error } = await query.limit(200);
      if (cancelled) return;
      if (error) {
        toast.error("فشل تحميل الأسئلة: " + error.message);
        setLoading(false);
        return;
      }
      const raw = (data || []) as unknown as Question[];
      let ordered = shuffle(raw);

      if (config.difficulty === "ascend") {
        const order: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
        ordered = ordered.sort((a, b) => order[a.difficulty] - order[b.difficulty]);
      }

      const limit = config.questionCount === 0 ? ordered.length : config.questionCount;
      setPool(ordered.slice(0, limit > 0 ? limit : ordered.length));
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [open, modeId, categoryId, config]);

  // Timer
  useEffect(() => {
    if (!open || loading || finished || revealed || !splashDone || !config?.timerSeconds) return;
    if (timeLeft <= 0) {
      handleAnswer(-1); // timeout
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, open, loading, finished, revealed, config]);

  const current = pool[index];
  const totalQ = pool.length;

  const handleAnswer = (optionIdx: number) => {
    if (revealed || !current) return;
    setSelected(optionIdx);
    setRevealed(true);
    const isCorrect = optionIdx === current.correct_answer;

    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      const diffBonus = current.difficulty === "hard" ? 30 : current.difficulty === "medium" ? 20 : 10;
      const timeBonus = config.timerSeconds > 0 ? Math.max(0, timeLeft) : 5;
      setScore((s) => s + diffBonus + timeBonus);
    } else {
      if (config.lives > 0) {
        const newLives = livesLeft - 1;
        setLivesLeft(newLives);
        if (newLives <= 0) {
          setTimeout(() => endGame(), 1500);
          return;
        }
      }
    }

    // Auto-advance unless explanation mode
    if (!config.showExplanation) {
      setTimeout(() => nextQuestion(), 1200);
    }
  };

  const nextQuestion = () => {
    const isLast = config.questionCount > 0 ? index + 1 >= totalQ : index + 1 >= pool.length;
    if (isLast) {
      endGame();
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
    setTimeLeft(config.timerSeconds);
  };

  const endGame = async () => {
    setFinished(true);
    if (sessionSavedRef.current || !user) return;
    sessionSavedRef.current = true;
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const xp = Math.floor(score / 2) + correctCount * 5;
    const perfect = totalQ > 0 && correctCount === totalQ;
    const coins = correctCount * 2 + (perfect ? 20 : 0); // perfect bonus
    await supabase.from("game_sessions").insert({
      user_id: user.id,
      mode: "solo",
      category_id: categoryId,
      difficulty: config.difficulty === "ascend" || config.difficulty === "mixed" ? "medium" : config.difficulty,
      score,
      correct_answers: correctCount,
      total_questions: index + 1,
      xp_earned: xp,
      duration_seconds: duration,
    });
    const award = await awardGame({ xp, coins, perfect });
    if (award?.leveledUp) {
      toast.success(`🎉 وصلت للمستوى ${award.level}!`, {
        description: `+${xp} XP · +${coins} 🪙${perfect ? " · بونص الكمال 🌟" : ""}`,
        duration: 7000,
      });
    } else {
      toast.success(`+${xp} XP · +${coins} 🪙`, {
        description: `${correctCount}/${totalQ} صح${perfect ? " · بونص الكمال +20 🪙" : ""}${award && award.current_streak > 1 ? ` · سلسلة ${award.current_streak} 🔥` : ""}`,
        duration: 6000,
      });
    }
  };


  const handleClose = () => {
    if (!finished && pool.length > 0 && !sessionSavedRef.current) {
      endGame();
    }
    onClose();
  };

  if (!config) return null;

  const progressPct = totalQ > 0 ? ((index + (revealed ? 1 : 0)) / totalQ) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        ref={fsRef}
        className="!fixed !inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0 w-screen h-[100dvh] max-w-none overflow-y-auto rounded-none border-0 p-3 pt-11 gap-0 sm:!inset-auto sm:!left-[50%] sm:!top-[50%] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-lg sm:border sm:p-6 data-[fs=true]:max-w-none data-[fs=true]:max-h-none data-[fs=true]:h-[100dvh] data-[fs=true]:w-screen data-[fs=true]:rounded-none"
        data-fs={isFullscreen || undefined}
      >
        {/* Pre-match splash */}
        {open && !splashDone && pool.length > 0 && !finished && (
          <MatchSplash
            title={config.title}
            subtitle={`${categoryTitle} · ${branchTitle}`}
            countdown
            loaded={!loading}
            onReady={() => setSplashDone(true)}
          />
        )}
        {/* Floating controls + HUD */}
        {!loading && pool.length > 0 && !finished && (
          <>
            <div className="absolute top-2 left-2 z-20 flex gap-1 sm:top-3 sm:left-3">
              <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => setMuted(!muted)} title={muted ? "تشغيل الصوت" : "كتم الصوت"} aria-label="صوت">
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8" onClick={toggleFs} title="ملء الشاشة" aria-label="ملء الشاشة">
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
            <div className="absolute top-2 right-10 z-20 sm:top-3 sm:right-12"><PlayerHud compact /></div>
          </>
        )}
        {loading ? (
          <div className="py-12 sm:py-16 flex flex-col items-center gap-3">
            <Loader2 className="h-7 w-7 sm:h-8 sm:w-8 animate-spin text-primary" />
            <p className="text-xs sm:text-sm text-muted-foreground">جاري تحميل الأسئلة...</p>
          </div>
        ) : pool.length === 0 ? (
          <div className="py-12 text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <X className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-bold">مفيش أسئلة كفاية</h3>
              <p className="text-sm text-muted-foreground mt-1">
                مفيش أسئلة في فئة "{categoryTitle}" بصعوبة "{config.difficulty}". الأدمن لازم يضيف أسئلة الأول.
              </p>
            </div>
            <Button onClick={onClose}>تمام</Button>
          </div>
        ) : finished ? (
          <ResultsView
            score={score}
            correct={correctCount}
            total={index + (revealed ? 1 : 0) || 1}
            modeTitle={config.title}
            onClose={onClose}
          />
        ) : current ? (
          <div className="space-y-3 sm:space-y-4">
            {/* Header: category pills + close */}
            <div className="flex items-center justify-between gap-2">
              <button onClick={handleClose} className="text-muted-foreground hover:text-foreground p-1 -m-1" aria-label="إغلاق">
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold bg-warning/20 text-warning border border-warning/30">
                  {config.title}
                </span>
                <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-secondary/60 text-foreground border border-border/50">
                  {branchTitle}
                </span>
                <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-secondary/60 text-foreground border border-border/50">
                  {categoryTitle}
                </span>
              </div>
            </div>

            {/* Stats bar: timer left, score + progress right */}
            <div className="flex items-center justify-between text-xs sm:text-sm">
              {config.timerSeconds > 0 ? (
                <div className={cn(
                  "flex items-center gap-1.5 font-bold text-sm sm:text-base",
                  timeLeft <= 3 && "text-destructive animate-pulse"
                )}>
                  <Timer className="h-4 w-4" />
                  <span>{timeLeft}s</span>
                </div>
              ) : <span />}
              <div className="flex items-center gap-2.5 sm:gap-4">
                {config.lives > 0 && (
                  <div className="flex items-center gap-1">
                    {Array.from({ length: config.lives }).map((_, i) => (
                      <Heart
                        key={i}
                        className={cn("h-4 w-4", i < livesLeft ? "fill-destructive text-destructive" : "text-muted")}
                      />
                    ))}
                  </div>
                )}
                <span className="inline-flex items-center gap-1 font-bold text-warning">
                  <span className="text-lg sm:text-xl">⭐</span>
                  <span className="text-sm sm:text-base">{score}</span>
                </span>
                <span className="font-bold text-sm sm:text-base">
                  {totalQ > 0 ? `${index + 1} / ${totalQ}` : `${index + 1}`}
                </span>
              </div>
            </div>

            <Progress value={progressPct} className="h-1.5" />

            {/* Question */}
            <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/30 border-2">
              <CardContent className="p-[11px] sm:p-5 md:p-6">
                <div className="flex items-center justify-end mb-2 sm:mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-warning/20 text-warning">
                    {current.difficulty === "easy" ? "سهل" : current.difficulty === "hard" ? "صعب" : "متوسط"}
                  </span>
                </div>
                <h2 className="text-base md:text-xl font-bold leading-relaxed text-right">{current.question}</h2>
              </CardContent>
            </Card>

            {/* Options */}
            <div className="grid grid-cols-1 gap-2 sm:gap-2.5">
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
                      "text-right p-[11px] sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all flex items-center justify-between gap-2.5 sm:gap-3",
                      "hover:border-primary/50 hover:bg-primary/5",
                      !revealed && "border-border bg-card",
                      showCorrect && "border-success bg-success/10 text-success",
                      showWrong && "border-destructive bg-destructive/10 text-destructive",
                      revealed && !isCorrect && !isSelected && "opacity-50",
                    )}
                  >
                    <span className="text-sm sm:text-base font-medium leading-snug">{opt}</span>
                    {showCorrect && <Check className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />}
                    {showWrong && <X className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Explanation + next */}
            {revealed && config.showExplanation && (
              <div className="space-y-3">
                {current.explanation && (
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <p className="text-sm font-semibold mb-1">📚 الشرح:</p>
                      <p className="text-sm text-muted-foreground">{current.explanation}</p>
                    </CardContent>
                  </Card>
                )}
                <Button onClick={nextQuestion} className="w-full">
                  السؤال اللي بعده ←
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

const ResultsView = ({ score, correct, total, modeTitle, onClose }: {
  score: number; correct: number; total: number; modeTitle: string; onClose: () => void;
}) => {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const emoji = pct >= 80 ? "🏆" : pct >= 50 ? "👏" : "💪";
  const message = pct >= 80 ? "أداء أسطوري!" : pct >= 50 ? "كويس جداً، استمر!" : "حاول تاني، هتطلع أحسن!";

  return (
    <div className="py-6 sm:py-8 text-center space-y-4 sm:space-y-5">
      <div className="text-[52px] sm:text-6xl leading-none">{emoji}</div>
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold">{message}</h2>
        <p className="text-sm text-muted-foreground mt-1">{modeTitle}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-md mx-auto">
        <Card><CardContent className="p-3 sm:p-4">
          <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-primary mx-auto mb-1" />
          <div className="text-lg sm:text-2xl font-extrabold">{score}</div>
          <div className="text-[11px] text-muted-foreground">النقاط</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4">
          <Check className="h-4 w-4 sm:h-5 sm:w-5 text-success mx-auto mb-1" />
          <div className="text-lg sm:text-2xl font-extrabold">{correct}/{total}</div>
          <div className="text-[11px] text-muted-foreground">صح</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4">
          <div className="text-primary text-base sm:text-lg font-bold mx-auto mb-1">%</div>
          <div className="text-lg sm:text-2xl font-extrabold">{pct}%</div>
          <div className="text-[11px] text-muted-foreground">دقة</div>
        </CardContent></Card>
      </div>
      <Button onClick={onClose} className="w-full max-w-xs">
        <RotateCw className="h-4 w-4" /> العب تاني
      </Button>
    </div>
  );
};
