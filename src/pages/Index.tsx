import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, Gamepad2, Trophy, Sparkles, Calendar, Users, Zap, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ProfileStats {
  display_name: string;
  total_xp: number;
  level: number;
  games_played: number;
}

interface LeaderEntry {
  display_name: string;
  total_xp: number;
  avatar_url: string | null;
}

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileStats | null>(null);
  const [topPlayers, setTopPlayers] = useState<LeaderEntry[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("display_name, total_xp, level, games_played")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) setProfile(data);
      }

      const { data: leaders } = await supabase
        .from("profiles")
        .select("display_name, total_xp, avatar_url")
        .order("total_xp", { ascending: false })
        .limit(5);
      if (leaders) setTopPlayers(leaders);
    };

    fetchData();
  }, [user]);

  const features = [
    { icon: Gamepad2, title: "لعب فردي", desc: "اختار فئة وصعوبة وابدأ" },
    { icon: Calendar, title: "تحدي يومي", desc: "10 أسئلة كل يوم + XP مضاعف" },
    { icon: Users, title: "غرف جماعية", desc: "العب لايف مع أصحابك" },
    { icon: Sparkles, title: "ذكاء اصطناعي", desc: "شرح الإجابات بالـ AI" },
  ];

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      

      {/* Hero */}
      <section className="container py-12 md:py-20">
        <div className="max-w-3xl mx-auto text-center space-y-6 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">منصة الأسئلة والتحديات #1</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight">
            <span className="gradient-text">شغّل مخك</span>
            <br />
            <span className="text-foreground">واتحدى أصحابك</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            اختبر معلوماتك في مئات الفئات، اكسب نقاط XP، افتح إنجازات، والعب لايف مع أصحابك في غرف جماعية
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button
              size="lg"
              className="text-base font-bold h-14 px-8 gradient-bg hover:opacity-90 shadow-elevated"
              onClick={() => navigate(user ? "/play" : "/auth")}
            >
              <Gamepad2 className="h-5 w-5" />
              ابدأ اللعب الآن
            </Button>
            {!user && (
              <Button
                size="lg"
                variant="outline"
                className="text-base h-14 px-8"
                onClick={() => navigate("/auth")}
              >
                إنشاء حساب
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* User Stats (if logged in) */}
      {user && profile && (
        <section className="container pb-12">
          <Card className="gradient-card border-primary/20 shadow-card animate-fade-in">
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">أهلاً</p>
                  <h2 className="text-2xl font-bold">{profile.display_name}</h2>
                </div>
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="flex items-center gap-1 justify-center text-primary mb-1">
                      <Zap className="h-4 w-4" />
                      <span className="text-2xl font-extrabold">{profile.total_xp}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">نقطة XP</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 justify-center text-accent mb-1">
                      <Target className="h-4 w-4" />
                      <span className="text-2xl font-extrabold">{profile.level}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">المستوى</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 justify-center text-success mb-1">
                      <Gamepad2 className="h-4 w-4" />
                      <span className="text-2xl font-extrabold">{profile.games_played}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">لعبة</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Features */}
      <section className="container py-12">
        <h2 className="text-3xl font-extrabold text-center mb-10">
          أوضاع <span className="gradient-text">اللعب</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="gradient-card border-border/50 hover:border-primary/50 transition-smooth hover:scale-105 cursor-pointer animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
                onClick={() => navigate(user ? "/play" : "/auth")}
              >
                <CardContent className="p-6 text-center space-y-3">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Top Players */}
      {topPlayers.length > 0 && (
        <section className="container py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-extrabold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              صدارة اللاعبين
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/leaderboard")}>
              عرض الكل
            </Button>
          </div>
          <Card className="gradient-card border-border/50">
            <CardContent className="p-4 space-y-2">
              {topPlayers.map((player, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-smooth"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full font-extrabold text-sm ${
                      i === 0
                        ? "bg-primary text-primary-foreground"
                        : i === 1
                        ? "bg-muted text-foreground"
                        : i === 2
                        ? "bg-accent/30 text-accent"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{player.display_name}</p>
                  </div>
                  <div className="flex items-center gap-1 text-primary font-bold">
                    <Zap className="h-4 w-4" />
                    {player.total_xp}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Footer */}
      <footer className="container py-12 text-center text-sm text-muted-foreground border-t border-border/30 mt-12">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Brain className="h-4 w-4 text-primary" />
          <span className="font-bold">شغّل مخك</span>
        </div>
        <p>منصة الأسئلة والتحديات التفاعلية</p>
      </footer>
    </div>
  );
};

export default Index;
