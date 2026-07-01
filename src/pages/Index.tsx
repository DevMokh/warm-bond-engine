import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
}

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileStats | null>(null);
  const [topPlayers, setTopPlayers] = useState<LeaderEntry[]>([]);

  useEffect(() => {
    const run = async () => {
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
        .select("display_name, total_xp")
        .order("total_xp", { ascending: false })
        .limit(5);
      if (leaders) setTopPlayers(leaders);
    };
    run();
  }, [user]);

  const features = [
    { num: "01", title: "لعب فردي", desc: "اختر فئة، صعوبة، وابدأ رحلتك." },
    { num: "02", title: "تحدي يومي", desc: "عشرة أسئلة كل يوم، نقاط مضاعفة." },
    { num: "03", title: "غرف جماعية", desc: "العب لايف مع أصحابك بلحظتها." },
    { num: "04", title: "شرح بالذكاء", desc: "تفسير مُوجز لكل إجابة." },
  ];

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Hero */}
      <section className="container pt-12 md:pt-24 pb-10 md:pb-16">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <p className="kicker">مسار المعرفة · النسخة الجديدة</p>
          <h1
            className="font-serif leading-[1.15] text-foreground"
            style={{ fontSize: "clamp(2.25rem, 8vw, 4.5rem)" }}
          >
            شغّل مخك.
            <br />
            <span className="text-primary">تعلّم بهدوء.</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
            منصة أسئلة تقرأها كما تقرأ كتاباً. اثنتا عشرة فئة معرفية،
            أربعة تخصصات لكل فئة، ووقت هادئ لتفكيرك.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button
              size="lg"
              className="text-sm font-medium h-12 px-8 rounded-xl"
              onClick={() => navigate(user ? "/play" : "/auth")}
            >
              ابدأ اللعب
            </Button>
            {!user && (
              <Button
                size="lg"
                variant="outline"
                className="text-sm h-12 px-8 rounded-xl"
                onClick={() => navigate("/auth")}
              >
                إنشاء حساب
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Profile summary */}
      {user && profile && (
        <section className="container py-8">
          <div className="max-w-2xl mx-auto border-y border-border py-6 grid grid-cols-4 gap-4 text-center">
            <div className="border-l border-border">
              <p className="kicker mb-1.5">أهلاً</p>
              <p className="text-sm font-medium truncate">{profile.display_name}</p>
            </div>
            <div className="border-l border-border">
              <p className="kicker mb-1.5">XP</p>
              <p className="text-lg font-serif tabular-nums">{profile.total_xp}</p>
            </div>
            <div className="border-l border-border">
              <p className="kicker mb-1.5">المستوى</p>
              <p className="text-lg font-serif tabular-nums">{profile.level}</p>
            </div>
            <div>
              <p className="kicker mb-1.5">ألعاب</p>
              <p className="text-lg font-serif tabular-nums">{profile.games_played}</p>
            </div>
          </div>
        </section>
      )}

      {/* Features — magazine list */}
      <section className="container py-12 md:py-16">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-baseline justify-between mb-8 border-b border-border pb-3">
            <h2 className="font-serif text-2xl">أوضاع اللعب</h2>
            <span className="kicker">أربعة مسارات</span>
          </div>
          <div className="divide-y divide-border">
            {features.map((f) => (
              <button
                key={f.num}
                onClick={() => navigate(user ? "/play" : "/auth")}
                className="w-full py-5 flex items-center justify-between text-right group transition-colors hover:bg-muted/40 px-3 -mx-3 rounded-lg"
              >
                <div className="flex items-baseline gap-5">
                  <span className="text-xs font-semibold text-primary tabular-nums">{f.num}</span>
                  <div>
                    <h3 className="text-lg font-medium text-foreground">{f.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{f.desc}</p>
                  </div>
                </div>
                <span className="text-muted-foreground text-lg group-hover:text-primary group-hover:-translate-x-1 transition-all">←</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Top players */}
      {topPlayers.length > 0 && (
        <section className="container py-12">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-baseline justify-between mb-6 border-b border-border pb-3">
              <h2 className="font-serif text-2xl">صدارة اللاعبين</h2>
              <button
                onClick={() => navigate("/leaderboard")}
                className="kicker hover:text-primary transition-colors"
              >
                عرض الكل ←
              </button>
            </div>
            <div className="space-y-0 divide-y divide-border">
              {topPlayers.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <span className={`text-xs font-semibold tabular-nums w-6 ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="font-medium">{p.display_name}</p>
                  </div>
                  <p className="text-sm font-serif tabular-nums text-muted-foreground">{p.total_xp}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="container py-10 mt-8 border-t border-border">
        <div className="max-w-2xl mx-auto text-center space-y-2">
          <p className="font-serif text-lg">شغّل مخك</p>
          <p className="kicker">منصة الأسئلة والتحديات · هادئة، أنيقة، عربية</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
