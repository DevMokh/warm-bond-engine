import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ProfileStats = {
  total_xp: number;
  level: number;
  coins: number;
  current_streak: number;
  longest_streak: number;
  last_play_date: string | null;
  last_daily_claim: string | null;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

const XP_PER_LEVEL = 500;

export const xpForLevel = (lvl: number) => lvl * XP_PER_LEVEL;
export const levelProgress = (xp: number, level: number) => {
  const base = (level - 1) * XP_PER_LEVEL;
  const into = xp - base;
  return { into: Math.max(0, into), needed: XP_PER_LEVEL, pct: Math.min(100, (into / XP_PER_LEVEL) * 100) };
};

export function useProfileStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setStats(null); setLoading(false); return; }
    const { data } = await supabase
      .from("profiles")
      .select("total_xp, level, coins, current_streak, longest_streak, last_play_date, last_daily_claim, display_name, username, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setStats(data as ProfileStats);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime updates on this profile
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`profile-stats-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        (p) => setStats(p.new as ProfileStats))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  /**
   * Award XP + coins, and update daily streak.
   * Returns the new stats locally (DB also updated).
   */
  const awardGame = useCallback(async (opts: { xp: number; coins: number; perfect?: boolean }) => {
    if (!user || !stats) return null;
    const today = new Date().toISOString().slice(0, 10);
    const last = stats.last_play_date;
    let streak = stats.current_streak;
    if (last !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      streak = last === yesterday ? streak + 1 : 1;
    }
    const newXp = (stats.total_xp || 0) + opts.xp;
    const newLevel = Math.max(1, Math.floor(newXp / XP_PER_LEVEL) + 1);
    const newCoins = (stats.coins || 0) + opts.coins;
    const longest = Math.max(stats.longest_streak || 0, streak);
    const { error } = await supabase
      .from("profiles")
      .update({
        total_xp: newXp,
        level: newLevel,
        coins: newCoins,
        current_streak: streak,
        longest_streak: longest,
        last_play_date: today,
      })
      .eq("user_id", user.id);
    if (!error) {
      const next = { ...stats, total_xp: newXp, level: newLevel, coins: newCoins, current_streak: streak, longest_streak: longest, last_play_date: today };
      setStats(next);
      return { ...next, leveledUp: newLevel > (stats.level || 1) };
    }
    return null;
  }, [user, stats]);

  return { stats, loading, refresh, awardGame };
}
