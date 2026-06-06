import { useEffect, useRef, useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  subtitle?: string;
  /** When true, show a 3-2-1-GO countdown before calling onReady. Else show indefinite loader. */
  countdown?: boolean;
  /** Called when splash should disappear (countdown done OR external loaded=true after delay). */
  onReady?: () => void;
  /** External "data ready" signal. If undefined, splash relies on countdown only. */
  loaded?: boolean;
  /** Min visible duration in ms even after loaded. */
  minMs?: number;
};

/**
 * Pre-match splash with animated brand + loading bar + optional countdown.
 * Designed to feel like a mobile game intro.
 */
export const MatchSplash = ({ title = "جاري التحضير", subtitle, countdown = true, onReady, loaded = true, minMs = 1200 }: Props) => {
  const [count, setCount] = useState<number | "GO" | null>(countdown ? 3 : null);
  const [shownAt] = useState(() => Date.now());

  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);

  useEffect(() => {
    if (!countdown || !loaded) return;
    let t: ReturnType<typeof setTimeout>;
    const tick = (n: number | "GO") => {
      setCount(n);
      if (n === "GO") {
        t = setTimeout(() => onReadyRef.current?.(), 600);
      } else if (typeof n === "number") {
        t = setTimeout(() => tick(n === 1 ? "GO" : n - 1), 700);
      }
    };
    tick(3);
    return () => clearTimeout(t);
  }, [countdown, loaded]);

  useEffect(() => {
    if (countdown || !loaded) return;
    const remaining = Math.max(0, minMs - (Date.now() - shownAt));
    const t = setTimeout(() => onReadyRef.current?.(), remaining);
    return () => clearTimeout(t);
  }, [countdown, loaded, minMs, shownAt]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur animate-in fade-in duration-300">
      {/* Brand burst */}
      <div className="relative mb-6">
        <div className="absolute inset-0 -m-5 rounded-full bg-primary/20 blur-2xl animate-pulse" />
        <div className="relative h-[70px] w-[70px] rounded-2xl gradient-bg flex items-center justify-center shadow-2xl animate-in zoom-in-50 duration-500">
          <Zap className="h-9 w-9 text-primary-foreground drop-shadow-lg" />
        </div>
      </div>

      <h2 className="text-xl sm:text-2xl font-extrabold gradient-text mb-1 animate-in slide-in-from-bottom-2 duration-500">{title}</h2>
      {subtitle && <p className="text-xs sm:text-sm text-muted-foreground mb-5 animate-in slide-in-from-bottom-2 duration-700">{subtitle}</p>}

      {/* Countdown OR loader */}
      {count !== null ? (
        <div
          key={String(count)}
          className={cn(
            "text-[88px] max-[379px]:text-[72px] leading-none font-black animate-in zoom-in-50 duration-300",
            count === "GO" ? "text-success" : "text-primary",
          )}
        >
          {count}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <div className="w-48 h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary via-warning to-primary bg-[length:200%_100%] animate-[shimmer_1.2s_linear_infinite]" />
          </div>
        </div>
      )}
    </div>
  );
};
