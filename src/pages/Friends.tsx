import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Check, X, Trash2, Search, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Profile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  total_xp: number;
  level: number;
}

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "blocked";
  created_at: string;
  profile?: Profile;
}

const Friends = () => {
  const { user } = useAuth();
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: fs } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (!fs) { setLoading(false); return; }

    const otherIds = fs.map((f) => (f.requester_id === user.id ? f.addressee_id : f.requester_id));
    const { data: profs } = otherIds.length
      ? await supabase.from("profiles").select("*").in("user_id", otherIds)
      : { data: [] };

    const profMap = new Map((profs ?? []).map((p) => [p.user_id, p as Profile]));
    setFriendships(
      fs.map((f) => ({
        ...f,
        profile: profMap.get(f.requester_id === user.id ? f.addressee_id : f.requester_id),
      })) as Friendship[],
    );
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const searchUsers = async () => {
    if (!search.trim() || !user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
      .neq("user_id", user.id)
      .limit(20);
    setResults((data ?? []) as Profile[]);
  };

  const sendRequest = async (addresseeId: string) => {
    if (!user) return;
    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: addresseeId,
    });
    if (error) toast.error("في مشكلة - يمكن تكون أرسلت طلب من قبل");
    else {
      toast.success("تم إرسال طلب الصداقة");
      load();
    }
  };

  const respond = async (id: string, accept: boolean) => {
    if (accept) {
      await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
      toast.success("تم قبول الصداقة 🎉");
    } else {
      await supabase.from("friendships").delete().eq("id", id);
      toast.info("تم الرفض");
    }
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("friendships").delete().eq("id", id);
    toast.info("تم حذف الصديق");
    load();
  };

  if (!user) return null;

  const accepted = friendships.filter((f) => f.status === "accepted");
  const incoming = friendships.filter((f) => f.status === "pending" && f.addressee_id === user.id);
  const outgoing = friendships.filter((f) => f.status === "pending" && f.requester_id === user.id);

  const requestedIds = new Set(friendships.map((f) => (f.requester_id === user.id ? f.addressee_id : f.requester_id)));

  const FriendCard = ({ f, action }: { f: Friendship; action: React.ReactNode }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-smooth">
      <Avatar className="h-10 w-10">
        <AvatarFallback className="gradient-bg text-primary-foreground font-bold">
          {f.profile?.display_name?.[0] ?? "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{f.profile?.display_name ?? "مستخدم"}</p>
        <p className="text-xs text-muted-foreground truncate" dir="ltr">@{f.profile?.username}</p>
      </div>
      <Badge variant="outline" className="text-xs">L{f.profile?.level ?? 1}</Badge>
      {action}
    </div>
  );

  return (
    <div className="container py-6 max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <Users className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-extrabold">الأصدقاء</h1>
      </div>

      <Tabs defaultValue="friends" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="friends">الأصدقاء ({accepted.length})</TabsTrigger>
          <TabsTrigger value="incoming">واردة ({incoming.length})</TabsTrigger>
          <TabsTrigger value="outgoing">مرسلة ({outgoing.length})</TabsTrigger>
          <TabsTrigger value="search">بحث</TabsTrigger>
        </TabsList>

        <TabsContent value="friends">
          <Card><CardContent className="p-4 space-y-2">
            {loading ? <p className="text-center text-muted-foreground py-6">جاري التحميل...</p> :
              accepted.length === 0 ? <p className="text-center text-muted-foreground py-6">لسه ماعندكش أصدقاء، ابحث وأضف!</p> :
              accepted.map((f) => (
                <FriendCard key={f.id} f={f} action={
                  <Button size="sm" variant="ghost" onClick={() => remove(f.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                } />
              ))
            }
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="incoming">
          <Card><CardContent className="p-4 space-y-2">
            {incoming.length === 0 ? <p className="text-center text-muted-foreground py-6">مفيش طلبات واردة</p> :
              incoming.map((f) => (
                <FriendCard key={f.id} f={f} action={
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => respond(f.id, true)}><Check className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => respond(f.id, false)}><X className="h-4 w-4" /></Button>
                  </div>
                } />
              ))
            }
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="outgoing">
          <Card><CardContent className="p-4 space-y-2">
            {outgoing.length === 0 ? <p className="text-center text-muted-foreground py-6">مفيش طلبات مرسلة</p> :
              outgoing.map((f) => (
                <FriendCard key={f.id} f={f} action={
                  <Button size="sm" variant="ghost" onClick={() => remove(f.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                } />
              ))
            }
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="search">
          <Card>
            <CardHeader><CardTitle className="text-base">ابحث عن لاعب بالاسم أو @username</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="اسم المستخدم..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                />
                <Button onClick={searchUsers}><Search className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-2">
                {results.map((p) => (
                  <div key={p.user_id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="gradient-bg text-primary-foreground font-bold">{p.display_name?.[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{p.display_name}</p>
                      <p className="text-xs text-muted-foreground truncate" dir="ltr">@{p.username}</p>
                    </div>
                    <Badge variant="outline">L{p.level}</Badge>
                    {requestedIds.has(p.user_id) ? (
                      <Badge variant="secondary">مرسل</Badge>
                    ) : (
                      <Button size="sm" onClick={() => sendRequest(p.user_id)}>
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {results.length === 0 && search && <p className="text-center text-sm text-muted-foreground py-4">مفيش نتائج</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Friends;
