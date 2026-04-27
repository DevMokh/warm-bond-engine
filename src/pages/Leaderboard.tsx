import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Zap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LeaderEntry {
  display_name: string;
  username: string;
  avatar_url: string | null;
  total_xp: number;
  level: number;
  games_played: number;
}

const Leaderboard = () => {
  const [players, setPlayers] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, username, avatar_url, total_xp, level, games_played")
        .order("total_xp", { ascending: false })
        .limit(50);
      if (data) setPlayers(data);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      
      <div className="container py-8 max-w-3xl">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl gradient-bg shadow-elevated mb-4">
            <Trophy className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-extrabold gradient-text">الصدارة</h1>
          <p className="text-muted-foreground mt-2">أفضل اللاعبين في كل الأوقات</p>
        </div>

        <Card className="gradient-card border-border/50 shadow-card">
          <CardHeader>
            <CardTitle>أعلى 50 لاعب</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : players.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لسه مفيش لاعبين. كن أول واحد! 🚀
              </p>
            ) : (
              <div className="space-y-2">
                {players.map((player, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-smooth"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full font-extrabold shrink-0 ${
                        i === 0
                          ? "gradient-bg text-primary-foreground shadow-glow"
                          : i === 1
                          ? "bg-muted text-foreground"
                          : i === 2
                          ? "bg-accent/30 text-accent"
                          : "bg-secondary text-muted-foreground text-sm"
                      }`}
                    >
                      {i + 1}
                    </div>

                    <Avatar className="h-10 w-10">
                      <AvatarImage src={player.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary font-bold">
                        {player.display_name?.[0] ?? "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{player.display_name}</p>
                      <p className="text-xs text-muted-foreground">المستوى {player.level} • {player.games_played} لعبة</p>
                    </div>

                    <div className="flex items-center gap-1 text-primary font-bold shrink-0">
                      <Zap className="h-4 w-4" />
                      {player.total_xp}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Leaderboard;
