import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Medal, Plus, Users, Calendar, Trophy, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Participant {
  user_id: string;
  score: number;
  correct_answers: number;
  finished_at: string | null;
  joined_at: string;
  display_name: string;
  avatar_url: string | null;
}

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  questions_count: number;
  max_participants: number;
  status: "upcoming" | "active" | "completed" | "cancelled";
  starts_at: string;
  prize_xp: number;
  created_by: string;
  participant_count?: number;
  is_joined?: boolean;
  participants?: Participant[];
  last_update?: string | null;
}

interface Category { id: string; name_ar: string; }

const Tournaments = () => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", category_id: "", difficulty: "medium",
    questions_count: 10, max_participants: 16, prize_xp: 500,
  });

  const load = useCallback(async () => {
    const { data } = await supabase.from("tournaments").select("*").order("starts_at", { ascending: false });
    if (!data) return;

    const ids = data.map((t) => t.id);
    const { data: parts } = ids.length
      ? await supabase
          .from("tournament_participants")
          .select("tournament_id, user_id, score, correct_answers, finished_at, joined_at")
          .in("tournament_id", ids)
      : { data: [] };

    const userIds = Array.from(new Set((parts ?? []).map((p) => p.user_id)));
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds)
      : { data: [] };
    const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

    const byTournament = new Map<string, Participant[]>();
    const joined = new Set<string>();
    (parts ?? []).forEach((p) => {
      const prof = profileMap.get(p.user_id);
      const row: Participant = {
        user_id: p.user_id,
        score: p.score ?? 0,
        correct_answers: p.correct_answers ?? 0,
        finished_at: p.finished_at,
        joined_at: p.joined_at,
        display_name: prof?.display_name ?? "لاعب",
        avatar_url: prof?.avatar_url ?? null,
      };
      const arr = byTournament.get(p.tournament_id) ?? [];
      arr.push(row);
      byTournament.set(p.tournament_id, arr);
      if (p.user_id === user?.id) joined.add(p.tournament_id);
    });

    setTournaments(data.map((t) => {
      const list = (byTournament.get(t.id) ?? []).sort((a, b) => b.score - a.score);
      const lastUpdate = list
        .map((p) => p.finished_at)
        .filter((x): x is string => !!x)
        .sort()
        .at(-1) ?? null;
      return {
        ...t,
        participant_count: list.length,
        is_joined: joined.has(t.id),
        participants: list,
        last_update: lastUpdate,
      };
    }) as Tournament[]);
  }, [user]);

  useEffect(() => {
    load();
    supabase.from("categories").select("id, name_ar").then(({ data }) => setCategories(data ?? []));

    const channel = supabase
      .channel("tournament-participants-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_participants" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const create = async () => {
    if (!user || !form.name) return;
    const { error } = await supabase.from("tournaments").insert({
      name: form.name,
      description: form.description || null,
      category_id: form.category_id || null,
      difficulty: form.difficulty as "easy" | "medium" | "hard",
      questions_count: form.questions_count,
      max_participants: form.max_participants,
      prize_xp: form.prize_xp,
      created_by: user.id,
      status: "upcoming",
    });
    if (error) toast.error("فشل الإنشاء");
    else {
      toast.success("تم إنشاء البطولة 🏆");
      setOpen(false);
      setForm({ name: "", description: "", category_id: "", difficulty: "medium", questions_count: 10, max_participants: 16, prize_xp: 500 });
      load();
    }
  };

  const join = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("tournament_participants").insert({ tournament_id: id, user_id: user.id });
    if (error) toast.error("في مشكلة");
    else { toast.success("انضممت للبطولة!"); load(); }
  };

  const statusBadge = (s: string) => {
    const map = { upcoming: { label: "قادمة", variant: "secondary" as const },
      active: { label: "جارية", variant: "default" as const },
      completed: { label: "منتهية", variant: "outline" as const },
      cancelled: { label: "ملغاة", variant: "destructive" as const } };
    return map[s as keyof typeof map];
  };

  return (
    <div className="container py-6 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Medal className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-extrabold">البطولات</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" />بطولة جديدة</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>إنشاء بطولة</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>الاسم</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>الوصف</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>الفئة</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر فئة" /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>الصعوبة</Label>
                <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">سهل</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="hard">صعب</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>الأسئلة</Label><Input type="number" value={form.questions_count} onChange={(e) => setForm({ ...form, questions_count: +e.target.value })} /></div>
                <div><Label>اللاعبين</Label><Input type="number" value={form.max_participants} onChange={(e) => setForm({ ...form, max_participants: +e.target.value })} /></div>
                <div><Label>الجائزة</Label><Input type="number" value={form.prize_xp} onChange={(e) => setForm({ ...form, prize_xp: +e.target.value })} /></div>
              </div>
              <Button onClick={create} className="w-full">إنشاء</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tournaments.length === 0 && <p className="col-span-2 text-center text-muted-foreground py-12">مفيش بطولات حالياً، أنشئ واحدة!</p>}
        {tournaments.map((t) => {
          const sb = statusBadge(t.status);
          return (
            <Card key={t.id} className="gradient-card border-primary/20">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{t.name}</CardTitle>
                  <Badge variant={sb.variant}>{sb.label}</Badge>
                </div>
                {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-secondary/40">
                    <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <p className="font-bold">{t.participant_count}/{t.max_participants}</p>
                    <p className="text-muted-foreground">لاعبين</p>
                  </div>
                  <div className="p-2 rounded bg-secondary/40">
                    <Calendar className="h-4 w-4 mx-auto mb-1 text-accent" />
                    <p className="font-bold">{t.questions_count}</p>
                    <p className="text-muted-foreground">سؤال</p>
                  </div>
                  <div className="p-2 rounded bg-secondary/40">
                    <Zap className="h-4 w-4 mx-auto mb-1 text-warning" />
                    <p className="font-bold">{t.prize_xp}</p>
                    <p className="text-muted-foreground">XP</p>
                  </div>
                </div>

                {/* Leaderboard */}
                <div className="rounded-lg border border-border/50 bg-background/40 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-secondary/30 border-b border-border/50">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Trophy className="h-3.5 w-3.5 text-warning" /> ترتيب المتسابقين
                    </span>
                    {t.last_update && (
                      <span className="text-[10px] text-muted-foreground">
                        آخر تحديث: {new Date(t.last_update).toLocaleString("ar-EG", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                      </span>
                    )}
                  </div>
                  {(t.participants?.length ?? 0) === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-4">لا يوجد مشاركون بعد</p>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {t.participants!.slice(0, 5).map((p, i) => (
                        <div key={p.user_id} className={`flex items-center gap-2 px-3 py-2 text-sm ${p.user_id === user?.id ? "bg-primary/10" : ""}`}>
                          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold shrink-0 ${
                            i === 0 ? "bg-warning text-warning-foreground" :
                            i === 1 ? "bg-muted text-foreground" :
                            i === 2 ? "bg-accent/40 text-accent" :
                            "bg-secondary text-muted-foreground"
                          }`}>{i + 1}</span>
                          <span className="flex-1 truncate">{p.display_name}</span>
                          {p.finished_at && <span className="text-[10px] text-success">✓</span>}
                          <span className="inline-flex items-center gap-0.5 text-primary font-bold text-xs">
                            <Zap className="h-3 w-3" />{p.score} XP
                          </span>
                        </div>
                      ))}
                      {(t.participants?.length ?? 0) > 5 && (
                        <div className="px-3 py-1.5 text-[11px] text-center text-muted-foreground">
                          +{(t.participants!.length - 5)} لاعبين آخرين
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {t.is_joined ? (
                  <Button variant="secondary" disabled className="w-full"><Trophy className="h-4 w-4" />منضم</Button>
                ) : t.status === "completed" || t.status === "cancelled" ? (
                  <Button variant="outline" disabled className="w-full">انتهت</Button>
                ) : (t.participant_count ?? 0) >= t.max_participants ? (
                  <Button variant="outline" disabled className="w-full">ممتلئة</Button>
                ) : (
                  <Button onClick={() => join(t.id)} className="w-full">انضم الآن</Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Tournaments;
