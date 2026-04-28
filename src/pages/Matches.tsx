import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Swords, Check, X, Trophy, Play } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MatchPlayer } from "@/components/MatchPlayer";

interface Profile { user_id: string; display_name: string | null; username: string | null; level: number; }
interface Match {
  id: string;
  challenger_id: string;
  opponent_id: string;
  category_id: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  questions_count: number;
  status: "pending" | "active" | "completed" | "declined" | "cancelled";
  challenger_score: number;
  opponent_score: number;
  challenger_finished_at: string | null;
  opponent_finished_at: string | null;
  winner_id: string | null;
  challenger?: Profile;
  opponent?: Profile;
}
interface Category { id: string; name_ar: string; }

const Matches = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ opponent_id: "", category_id: "", difficulty: "medium", questions_count: 5 });

  const load = useCallback(async () => {
    if (!user) return;

    const { data: ms } = await supabase
      .from("matches")
      .select("*")
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!ms) return;

    const ids = Array.from(new Set(ms.flatMap((m) => [m.challenger_id, m.opponent_id])));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("user_id, display_name, username, level").in("user_id", ids)
      : { data: [] };

    const pmap = new Map((profs ?? []).map((p) => [p.user_id, p as Profile]));
    setMatches(ms.map((m) => ({ ...m, challenger: pmap.get(m.challenger_id), opponent: pmap.get(m.opponent_id) })) as Match[]);

    // load accepted friends
    const { data: fs } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    const friendIds = (fs ?? []).map((f) => (f.requester_id === user.id ? f.addressee_id : f.requester_id));
    if (friendIds.length) {
      const { data: fp } = await supabase.from("profiles").select("user_id, display_name, username, level").in("user_id", friendIds);
      setFriends((fp ?? []) as Profile[]);
    }
  }, [user]);

  useEffect(() => {
    load();
    supabase.from("categories").select("id, name_ar").then(({ data }) => setCategories(data ?? []));
  }, [load]);

  const challenge = async () => {
    if (!user || !form.opponent_id || !form.category_id) {
      toast.error("اختار صديق وفئة");
      return;
    }
    // get random questions
    const { data: qs } = await supabase
      .from("questions")
      .select("id")
      .eq("category_id", form.category_id)
      .eq("difficulty", form.difficulty as "easy" | "medium" | "hard")
      .eq("is_active", true)
      .limit(form.questions_count * 3);

    if (!qs || qs.length < form.questions_count) {
      toast.error("مفيش أسئلة كافية في الفئة دي");
      return;
    }
    const shuffled = qs.sort(() => Math.random() - 0.5).slice(0, form.questions_count);
    const { error } = await supabase.from("matches").insert({
      challenger_id: user.id,
      opponent_id: form.opponent_id,
      category_id: form.category_id,
      difficulty: form.difficulty as "easy" | "medium" | "hard",
      questions_count: form.questions_count,
      question_ids: shuffled.map((q) => q.id),
      status: "pending",
    });
    if (error) toast.error("فشل التحدي");
    else { toast.success("تم إرسال التحدي ⚔️"); setOpen(false); load(); }
  };

  const accept = async (id: string) => {
    await supabase.from("matches").update({ status: "active" }).eq("id", id);
    toast.success("قبلت التحدي - العب من خلال صفحة اللعب لاحقاً");
    load();
  };

  const decline = async (id: string) => {
    await supabase.from("matches").update({ status: "declined" }).eq("id", id);
    load();
  };

  if (!user) return null;

  const pending = matches.filter((m) => m.status === "pending" && m.opponent_id === user.id);
  const sent = matches.filter((m) => m.status === "pending" && m.challenger_id === user.id);
  const active = matches.filter((m) => m.status === "active");
  const done = matches.filter((m) => m.status === "completed");

  const MatchCard = ({ m, action }: { m: Match; action?: React.ReactNode }) => {
    const isChallenger = m.challenger_id === user.id;
    const me = isChallenger ? m.challenger : m.opponent;
    const opp = isChallenger ? m.opponent : m.challenger;
    const myScore = isChallenger ? m.challenger_score : m.opponent_score;
    const oppScore = isChallenger ? m.opponent_score : m.challenger_score;
    const won = m.winner_id === user.id;
    return (
      <div className="p-4 rounded-lg bg-secondary/30 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Avatar className="h-9 w-9"><AvatarFallback className="gradient-bg text-primary-foreground text-xs font-bold">{me?.display_name?.[0] ?? "أ"}</AvatarFallback></Avatar>
            <span className="font-bold text-sm truncate">أنت</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-background border border-border">
            <span className="text-lg font-extrabold">{myScore}</span>
            <Swords className="h-4 w-4 text-muted-foreground" />
            <span className="text-lg font-extrabold">{oppScore}</span>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <span className="font-bold text-sm truncate">{opp?.display_name}</span>
            <Avatar className="h-9 w-9"><AvatarFallback className="gradient-bg text-primary-foreground text-xs font-bold">{opp?.display_name?.[0] ?? "ع"}</AvatarFallback></Avatar>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            <Badge variant="outline" className="text-xs">{m.questions_count} سؤال</Badge>
            <Badge variant="secondary" className="text-xs">{m.difficulty}</Badge>
            {m.status === "completed" && (won ? <Badge className="bg-success text-success-foreground text-xs"><Trophy className="h-3 w-3" />فوز</Badge> : <Badge variant="destructive" className="text-xs">خسارة</Badge>)}
          </div>
          {action}
        </div>
      </div>
    );
  };

  return (
    <div className="container py-6 max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Swords className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-extrabold">تحديات 1v1</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => setOpen(true)}><Swords className="h-4 w-4" />تحدي جديد</Button>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>تحدي صديق</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>الصديق</Label>
                <Select value={form.opponent_id} onValueChange={(v) => setForm({ ...form, opponent_id: v })}>
                  <SelectTrigger><SelectValue placeholder={friends.length ? "اختر صديق" : "ضيف أصدقاء الأول"} /></SelectTrigger>
                  <SelectContent>{friends.map((f) => <SelectItem key={f.user_id} value={f.user_id}>{f.display_name} (L{f.level})</SelectItem>)}</SelectContent>
                </Select>
              </div>
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
              <div><Label>عدد الأسئلة</Label><Input type="number" min={3} max={20} value={form.questions_count} onChange={(e) => setForm({ ...form, questions_count: +e.target.value })} /></div>
              <Button onClick={challenge} className="w-full">إرسال التحدي</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="pending">واردة ({pending.length})</TabsTrigger>
          <TabsTrigger value="sent">مرسلة ({sent.length})</TabsTrigger>
          <TabsTrigger value="active">جارية ({active.length})</TabsTrigger>
          <TabsTrigger value="done">منتهية ({done.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending"><Card><CardContent className="p-4 space-y-2">
          {pending.length === 0 ? <p className="text-center text-muted-foreground py-6">مفيش تحديات واردة</p> :
            pending.map((m) => <MatchCard key={m.id} m={m} action={
              <div className="flex gap-1">
                <Button size="sm" onClick={() => accept(m.id)}><Check className="h-4 w-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => decline(m.id)}><X className="h-4 w-4" /></Button>
              </div>
            } />)}
        </CardContent></Card></TabsContent>
        <TabsContent value="sent"><Card><CardContent className="p-4 space-y-2">
          {sent.length === 0 ? <p className="text-center text-muted-foreground py-6">مفيش تحديات مرسلة</p> :
            sent.map((m) => <MatchCard key={m.id} m={m} />)}
        </CardContent></Card></TabsContent>
        <TabsContent value="active"><Card><CardContent className="p-4 space-y-2">
          {active.length === 0 ? <p className="text-center text-muted-foreground py-6">مفيش تحديات جارية</p> :
            active.map((m) => <MatchCard key={m.id} m={m} />)}
        </CardContent></Card></TabsContent>
        <TabsContent value="done"><Card><CardContent className="p-4 space-y-2">
          {done.length === 0 ? <p className="text-center text-muted-foreground py-6">لسه ما لعبتش تحديات</p> :
            done.map((m) => <MatchCard key={m.id} m={m} />)}
        </CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
};

export default Matches;
