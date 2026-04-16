import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Zap, Target, Gamepad2, Trophy, Award } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Profile {
  display_name: string;
  username: string;
  avatar_url: string | null;
  age_group: string;
  total_xp: number;
  level: number;
  games_played: number;
  games_won: number;
  total_score: number;
}

interface AchievementData {
  id: string;
  unlocked_at: string;
  achievements: {
    name_ar: string;
    description_ar: string;
    icon: string;
    xp_reward: number;
  };
}

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [achievements, setAchievements] = useState<AchievementData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const [profileRes, achievementsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_achievements")
          .select("id, unlocked_at, achievements(name_ar, description_ar, icon, xp_reward)")
          .eq("user_id", user.id)
          .order("unlocked_at", { ascending: false }),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (achievementsRes.data) setAchievements(achievementsRes.data as unknown as AchievementData[]);
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-20 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  // XP needed for next level (simple formula: level * 500)
  const xpForNextLevel = profile.level * 500;
  const xpProgress = (profile.total_xp % 500) / 500 * 100;
  const winRate = profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100)
    : 0;

  const ageGroupLabel: Record<string, string> = {
    youth: "شباب",
    cultured: "مثقف",
    family: "عائلي",
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Navbar />

      <div className="container py-8 max-w-4xl">
        {/* Profile Header */}
        <Card className="gradient-card border-primary/20 shadow-card mb-6 animate-fade-in">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <Avatar className="h-24 w-24 border-4 border-primary/30 shadow-glow">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-3xl font-extrabold gradient-bg text-primary-foreground">
                  {profile.display_name?.[0] ?? "?"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center md:text-right space-y-2">
                <h1 className="text-3xl font-extrabold">{profile.display_name}</h1>
                <p className="text-muted-foreground" dir="ltr">@{profile.username}</p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <Badge variant="secondary">{ageGroupLabel[profile.age_group] ?? "شباب"}</Badge>
                  <Badge className="gradient-bg text-primary-foreground border-0">
                    المستوى {profile.level}
                  </Badge>
                </div>
              </div>
            </div>

            {/* XP Progress */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">المستوى التالي</span>
                <span className="font-bold text-primary">
                  {profile.total_xp % 500} / 500 XP
                </span>
              </div>
              <Progress value={xpProgress} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="gradient-card">
            <CardContent className="p-4 text-center">
              <Zap className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-extrabold">{profile.total_xp}</p>
              <p className="text-xs text-muted-foreground">نقاط XP</p>
            </CardContent>
          </Card>
          <Card className="gradient-card">
            <CardContent className="p-4 text-center">
              <Gamepad2 className="h-6 w-6 text-accent mx-auto mb-2" />
              <p className="text-2xl font-extrabold">{profile.games_played}</p>
              <p className="text-xs text-muted-foreground">لعبة</p>
            </CardContent>
          </Card>
          <Card className="gradient-card">
            <CardContent className="p-4 text-center">
              <Trophy className="h-6 w-6 text-success mx-auto mb-2" />
              <p className="text-2xl font-extrabold">{winRate}%</p>
              <p className="text-xs text-muted-foreground">نسبة الفوز</p>
            </CardContent>
          </Card>
          <Card className="gradient-card">
            <CardContent className="p-4 text-center">
              <Target className="h-6 w-6 text-warning mx-auto mb-2" />
              <p className="text-2xl font-extrabold">{profile.total_score}</p>
              <p className="text-xs text-muted-foreground">النقاط الكلية</p>
            </CardContent>
          </Card>
        </div>

        {/* Achievements */}
        <Card className="gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              الإنجازات ({achievements.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {achievements.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لسه ما فتحتش إنجازات. ابدأ اللعب! 🎮
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {achievements.map((ach) => (
                  <div
                    key={ach.id}
                    className="p-4 rounded-xl bg-secondary/50 border border-border/50 text-center space-y-2 hover:border-primary/50 transition-smooth"
                  >
                    <div className="text-4xl">{ach.achievements.icon}</div>
                    <h3 className="font-bold text-sm">{ach.achievements.name_ar}</h3>
                    <p className="text-xs text-muted-foreground">
                      {ach.achievements.description_ar}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      +{ach.achievements.xp_reward} XP
                    </Badge>
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

export default Profile;
