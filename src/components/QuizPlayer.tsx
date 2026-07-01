import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, X, Check, RotateCw, Scissors, Lightbulb, ChevronsLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useGameSounds } from "@/hooks/useGameSounds";
import { useProfileStats } from "@/hooks/useProfileStats";
import { MatchSplash } from "./MatchSplash";

export type ModeConfig = {
  id: string;
  title: string;
  questionCount: number;
  difficulty: "easy" | "medium" | "hard" | "mixed" | "ascend";
  timerSeconds: number;
  lives: number;
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

const AR_LETTERS = ["أ", "ب", "ج", "د"];

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
  const [eliminatedIdx, setEliminatedIdx] = useState<number[]>([]);
  const [hintUsed, setHintUsed] = useState(false);
  const [powerCounts, setPowerCounts] = useState({ eliminate: 3, hint: 3, skip: 3 });
  const startTimeRef = useRef<number>(Date.now());
  const sessionSavedRef = useRef(false);
  const { ref: fsRef, isFullscreen } = useFullscreen<HTMLDivElement>({ autoOnFirstGesture: true });
  const { play } = useGameSounds();
  const { awardGame } = useProfileStats();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (!revealed || !pool[index]) return;
    const isCorrect = selected === pool[index].correct_answer;
    play(isCorrect ? "correct" : "wrong");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);
  useEffect(() => {
    if (finished) play(correctCount / Math.max(1, index + 1) >= 0.5 ? "win" : "lose");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

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
    setEliminatedIdx([]);
    setHintUsed(false);
    setPowerCounts({ eliminate: 3, hint: 3, skip: 3 });

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

  useEffect(() => {
    if (!open || loading || finished || revealed || !splashDone || !config?.timerSeconds) return;
    if (timeLeft <= 0) {
      handleAnswer(-1);
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, open, loading, finished, revealed, config, splashDone]);

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
    } else if (config.lives > 0) {
      const newLives = livesLeft - 1;
      setLivesLeft(newLives);
      if (newLives <= 0) {
        setTimeout(() => endGame(), 1500);
        return;
      }
    }

    if (!config.showExplanation) {
      setTimeout(() => nextQuestion(), 1200);
    }
  };

  const nextQuestion = () => {
    const isLast = config.questionCount > 0 ? index + 1 >= totalQ : index + 1 >= pool.length;
    if (isLast) { endGame(); return; }
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
    setTimeLeft(config.timerSeconds);
    setEliminatedIdx([]);
    setHintUsed(false);
  };

  const usePowerEliminate = () => {
    if (!current || revealed || powerCounts.eliminate <= 0 || eliminatedIdx.length > 0) return;
    const wrongs = current.options.map((_, i) => i).filter(i => i !== current.correct_answer);
    const toRemove = shuffle(wrongs).slice(0, 2);
    setEliminatedIdx(toRemove);
    setPowerCounts(p => ({ ...p, eliminate: p.eliminate - 1 }));
  };
  const usePowerHint = () => {
    if (!current || revealed || powerCounts.hint <= 0 || hintUsed) return;
    setHintUsed(true);
    setPowerCounts(p => ({ ...p, hint: p.hint - 1 }));
  };
  const usePowerSkip = () => {
    if (!current || revealed || powerCounts.skip <= 0) return;
    setPowerCounts(p => ({ ...p, skip: p.skip - 1 }));
    nextQuestion();
  };

  const endGame = async () => {
    setFinished(true);
    if (sessionSavedRef.current || !user) return;
    sessionSavedRef.current = true;
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const xp = Math.floor(score / 2) + correctCount * 5;
    const perfect = totalQ > 0 && correctCount === totalQ;
    const coins = correctCount * 2 + (perfect ? 20 : 0);
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
        description: `+${xp} XP · +${coins} 🪙${perfect ? " · بونص الكمال ✨" : ""}`,
      });
    } else {
      toast.success(`+${xp} XP · +${coins} 🪙`, {
        description: `${correctCount}/${totalQ} صح${perfect ? " · بونص الكمال +20 🪙" : ""}`,
      });
    }
  };

  const handleClose = () => {
    if (!finished && pool.length > 0 && !sessionSavedRef.current) endGame();
    onClose();
  };

  if (!config) return null;

  const progressPct = totalQ > 0 ? ((index + (revealed ? 1 : 0)) / totalQ) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        ref={fsRef}
        className="!fixed !inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0 w-screen h-[100dvh] max-w-none overflow-y-auto rounded-none border-0 p-0 gap-0 bg-background sm:!inset-auto sm:!left-[50%] sm:!top-[50%] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:h-auto sm:max-h-[92vh] sm:max-w-lg sm:rounded-3xl sm:border data-[fs=true]:max-w-none data-[fs=true]:max-h-none data-[fs=true]:h-[100dvh] data-[fs=true]:w-screen data-[fs=true]:rounded-none"
        data-fs={isFullscreen || undefined}
      >
        {open && !splashDone && pool.length > 0 && !finished && (
          <MatchSplash
            title={config.title}
            subtitle={`${categoryTitle} · ${branchTitle}`}
            countdown
            loaded={!loading}
            onReady={() => setSplashDone(true)}
          />
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground tracking-widest uppercase">جاري التحميل</p>
          </div>
        ) : pool.length === 0 ? (
          <div className="py-16 px-8 text-center space-y-5">
            <div className="mx-auto h-12 w-12 rounded-full border border-border flex items-center justify-center">
              <X className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="kicker mb-2">لا يوجد محتوى</p>
              <h3 className="text-xl font-serif">مفيش أسئلة كفاية</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                فئة "{categoryTitle}" بصعوبة "{config.difficulty}" لسه فاضية.
              </p>
            </div>
            <Button variant="outline" onClick={onClose}>الرجوع</Button>
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
          <div className="flex flex-col h-full min-h-[100dvh] sm:min-h-0 sm:h-auto">
            {/* Header */}
            <div className="px-6 pt-8 sm:pt-6">
              <div className="flex justify-between items-center mb-5">
                <button
                  onClick={handleClose}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 -m-1"
                  aria-label="إغلاق"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="flex gap-4 items-center">
                  {config.timerSeconds > 0 && (
                    <span className={cn(
                      "text-xs font-medium tracking-widest tabular-nums",
                      timeLeft <= 3 ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {String(timeLeft).padStart(2, "0")}s
                    </span>
                  )}
                  <span className="text-xs font-medium tracking-widest text-primary tabular-nums">
                    {String(index + 1).padStart(2, "0")} / {String(totalQ || 0).padStart(2, "0")}
                  </span>
                  {config.lives > 0 && (
                    <div className="flex gap-1">
                      {Array.from({ length: config.lives }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            i < livesLeft ? "bg-destructive" : "bg-border"
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Thin progress hairline */}
              <div className="w-full h-px bg-border relative overflow-hidden">
                <div
                  className="absolute right-0 top-0 h-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Question + options */}
            <div className="px-6 py-8 sm:py-10 flex-1 flex flex-col">
              <div className="mb-8 sm:mb-10 text-center">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest border-b border-border pb-1 font-medium">
                  {categoryTitle} · {branchTitle}
                </span>
                <h2
                  className="font-serif mt-6 leading-relaxed text-foreground text-center"
                  style={{ fontSize: "clamp(1.125rem, 4.5vw, 1.5rem)" }}
                >
                  {current.question}
                </h2>
                <p className="text-[10px] mt-3 tracking-widest uppercase text-muted-foreground">
                  {current.difficulty === "easy" ? "سهل" : current.difficulty === "hard" ? "صعب" : "متوسط"}
                </p>
              </div>

              <div className="space-y-3">
                {current.options.map((opt, i) => {
                  const isCorrect = i === current.correct_answer;
                  const isSelected = selected === i;
                  const showCorrect = revealed && isCorrect;
                  const showWrong = revealed && isSelected && !isCorrect;
                  const isEliminated = eliminatedIdx.includes(i);
                  const isHintDim = hintUsed && !revealed && i !== current.correct_answer && !isEliminated;
                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(i)}
                      disabled={revealed || isEliminated}
                      className={cn(
                        "w-full text-right rounded-xl border transition-all flex items-center gap-4 group",
                        "px-5 py-4",
                        !revealed && !isEliminated && !isHintDim && "border-border bg-card hover:border-primary hover:bg-muted",
                        showCorrect && "border-primary bg-primary/5 text-foreground",
                        showWrong && "border-destructive bg-destructive/5 text-destructive",
                        revealed && !isCorrect && !isSelected && "opacity-40",
                        isEliminated && "opacity-20 line-through",
                        isHintDim && "opacity-40",
                      )}
                      style={{ fontSize: "clamp(0.9375rem, 3.6vw, 1rem)" }}
                    >
                      <span className={cn(
                        "text-[10px] font-semibold uppercase tracking-wider shrink-0",
                        showCorrect ? "text-primary" : showWrong ? "text-destructive" : "text-muted-foreground group-hover:text-primary"
                      )}>
                        {AR_LETTERS[i] || String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1">{opt}</span>
                      {showCorrect && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      {showWrong && <X className="h-4 w-4 shrink-0 text-destructive" />}
                    </button>
                  );
                })}
              </div>

              {revealed && config.showExplanation && current.explanation && (
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="kicker mb-2">الشرح</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{current.explanation}</p>
                  <Button onClick={nextQuestion} variant="outline" className="w-full mt-4">
                    التالي ←
                  </Button>
                </div>
              )}
            </div>

            {/* Power-up bar */}
            {!finished && (
              <div className="mt-auto px-6 py-5 bg-muted/40 border-t border-border">
                <div className="flex justify-between items-center gap-3">
                  <PowerButton
                    icon={Scissors}
                    label="حذف إجابتين"
                    count={powerCounts.eliminate}
                    disabled={revealed || eliminatedIdx.length > 0}
                    onClick={usePowerEliminate}
                  />
                  <PowerButton
                    icon={Lightbulb}
                    label="تلميح"
                    count={powerCounts.hint}
                    disabled={revealed || hintUsed}
                    onClick={usePowerHint}
                  />
                  <PowerButton
                    icon={ChevronsLeft}
                    label="تخطي السؤال"
                    count={powerCounts.skip}
                    disabled={revealed}
                    onClick={usePowerSkip}
                  />
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

const PowerButton = ({
  icon: Icon, label, count, disabled, onClick,
}: {
  icon: typeof Scissors; label: string; count: number; disabled: boolean; onClick: () => void;
}) => (
  <button
    onClick={onClick}
    disabled={disabled || count <= 0}
    className={cn(
      "flex-1 py-3 px-2 flex flex-col items-center gap-1.5 border border-border rounded-xl bg-card transition-colors",
      "hover:border-primary hover:bg-muted",
      "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:bg-card"
    )}
  >
    <div className="relative">
      <Icon className="h-4 w-4 text-foreground" />
      {count > 0 && (
        <span className="absolute -top-2 -right-3 text-[9px] font-semibold text-primary tabular-nums">
          {count}
        </span>
      )}
    </div>
    <span className="text-[11px] text-foreground font-medium leading-none">{label}</span>
  </button>
);

const ResultsView = ({ score, correct, total, modeTitle, onClose }: {
  score: number; correct: number; total: number; modeTitle: string; onClose: () => void;
}) => {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const message = pct >= 80 ? "أداء أسطوري" : pct >= 50 ? "أداء جيد" : "استمر في المحاولة";

  return (
    <div className="py-14 px-8 text-center space-y-8">
      <div>
        <p className="kicker mb-3">النتيجة</p>
        <h2 className="text-3xl font-serif text-foreground">{message}</h2>
        <p className="text-xs text-muted-foreground mt-2 tracking-widest uppercase">{modeTitle}</p>
      </div>

      <div className="grid grid-cols-3 gap-0 max-w-sm mx-auto border-y border-border py-6">
        <div className="border-l border-border">
          <p className="kicker mb-2">النقاط</p>
          <p className="text-2xl font-serif tabular-nums">{score}</p>
        </div>
        <div className="border-l border-border">
          <p className="kicker mb-2">صح</p>
          <p className="text-2xl font-serif tabular-nums">{correct}<span className="text-muted-foreground text-lg">/{total}</span></p>
        </div>
        <div>
          <p className="kicker mb-2">الدقة</p>
          <p className="text-2xl font-serif tabular-nums">{pct}<span className="text-muted-foreground text-lg">%</span></p>
        </div>
      </div>

      <Button onClick={onClose} variant="outline" className="min-w-[180px]">
        <RotateCw className="h-4 w-4" /> الرجوع
      </Button>
    </div>
  );
};
