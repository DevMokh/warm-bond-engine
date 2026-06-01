import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const EMOJIS = ["🔥", "👏", "😂", "😱", "💀", "❤️", "🎯", "🤯"];

type Reaction = {
  id: string;
  match_id: string;
  user_id: string;
  emoji: string;
  question_index: number | null;
  created_at: string;
};

type FloatingItem = { id: string; emoji: string; left: number };

export function SpectatorChat({
  matchId,
  currentQuestionIndex,
}: {
  matchId: string;
  currentQuestionIndex?: number | null;
}) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [floating, setFloating] = useState<FloatingItem[]>([]);
  const [sending, setSending] = useState(false);
  const cooldownRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("match_reactions")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: false })
        .limit(40);
      if (!cancelled && data) setReactions((data as Reaction[]).reverse());
    })();
    const ch = supabase
      .channel(`reactions-${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "match_reactions", filter: `match_id=eq.${matchId}` },
        (p) => {
          const r = p.new as Reaction;
          setReactions((prev) => [...prev.slice(-39), r]);
          spawnFloating(r.emoji);
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [matchId]);

  const spawnFloating = (emoji: string) => {
    const item: FloatingItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      emoji,
      left: 10 + Math.random() * 80,
    };
    setFloating((f) => [...f, item]);
    setTimeout(() => setFloating((f) => f.filter((x) => x.id !== item.id)), 1800);
  };

  const send = async (emoji: string) => {
    if (!user || sending) return;
    const now = Date.now();
    if (now - cooldownRef.current < 350) return; // rate-limit
    cooldownRef.current = now;
    setSending(true);
    spawnFloating(emoji); // optimistic
    try {
      await supabase.from("match_reactions").insert({
        match_id: matchId,
        user_id: user.id,
        emoji,
        question_index: currentQuestionIndex ?? null,
      });
    } finally {
      setSending(false);
    }
  };

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    reactions.forEach((r) => map.set(r.emoji, (map.get(r.emoji) ?? 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [reactions]);

  return (
    <Card className="relative overflow-hidden">
      {/* Floating emoji layer */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {floating.map((f) => (
          <span
            key={f.id}
            className="absolute bottom-2 text-2xl animate-float-up"
            style={{ left: `${f.left}%` }}
          >
            {f.emoji}
          </span>
        ))}
      </div>

      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <MessageCircle className="h-3 w-3" /> تفاعلات المتفرّجين
          </div>
          {currentQuestionIndex != null && (
            <Badge variant="outline" className="text-[10px]">سؤال {currentQuestionIndex + 1}</Badge>
          )}
        </div>

        {/* Emoji bar */}
        <div className="grid grid-cols-8 gap-1">
          {EMOJIS.map((e) => (
            <Button
              key={e}
              type="button"
              variant="outline"
              onClick={() => send(e)}
              disabled={!user || sending}
              className={cn(
                "h-9 p-0 text-xl hover:scale-110 transition-transform",
                !user && "opacity-50",
              )}
              title={user ? "أرسل تفاعل" : "سجّل الدخول أولاً"}
            >
              {e}
            </Button>
          ))}
        </div>

        {/* Live counts */}
        {counts.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1 border-t border-border/40">
            {counts.slice(0, 8).map(([e, n]) => (
              <Badge key={e} variant="secondary" className="text-[11px] gap-1">
                <span>{e}</span>
                <span className="font-mono">{n}</span>
              </Badge>
            ))}
          </div>
        )}

        {!user && (
          <p className="text-[11px] text-muted-foreground text-center">سجّل الدخول علشان تتفاعل</p>
        )}
      </CardContent>
    </Card>
  );
}
