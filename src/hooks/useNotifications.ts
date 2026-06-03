import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type AppNotification = {
  id: string;
  user_id: string;
  type: "challenge" | "spectator" | "your_turn" | "system" | string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

type PermState = "default" | "granted" | "denied" | "unsupported";

const supportsNotif = () => typeof window !== "undefined" && "Notification" in window;

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [perm, setPerm] = useState<PermState>(() => supportsNotif() ? (Notification.permission as PermState) : "unsupported");

  // Load existing
  const load = useCallback(async () => {
    if (!user) { setItems([]); return; }
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setItems(data as AppNotification[]);
  }, [user]);
  useEffect(() => { load(); }, [load]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (p) => {
          const n = p.new as AppNotification;
          setItems((curr) => [n, ...curr].slice(0, 50));
          // in-app toast
          toast(n.title, { description: n.body ?? undefined });
          // browser push (foreground)
          if (supportsNotif() && Notification.permission === "granted") {
            try {
              const notif = new Notification(n.title, { body: n.body ?? undefined, icon: "/icon-192.png", badge: "/icon-192.png", tag: n.id });
              notif.onclick = () => {
                window.focus();
                const url = (n.data?.url as string | undefined) || "/matches";
                window.location.href = url;
                notif.close();
              };
            } catch { /* noop */ }
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const request = useCallback(async () => {
    if (!supportsNotif()) { setPerm("unsupported"); return "unsupported" as PermState; }
    if (Notification.permission === "granted") { setPerm("granted"); return "granted" as PermState; }
    const r = await Notification.requestPermission();
    setPerm(r as PermState);
    return r as PermState;
  }, []);

  const markRead = useCallback(async (id: string) => {
    setItems((curr) => curr.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    setItems((curr) => curr.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    await supabase.from("notifications").update({ read_at: now }).eq("user_id", user.id).is("read_at", null);
  }, [user]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  return { items, unreadCount, perm, request, markRead, markAllRead, supported: supportsNotif() };
}

/** Insert a notification row for another user. RLS allows any authenticated user to do this. */
export async function sendNotification(args: {
  toUserId: string;
  type: AppNotification["type"];
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}) {
  const { toUserId, type, title, body, data } = args;
  const row = {
    user_id: toUserId,
    type,
    title,
    body: body ?? null,
    data: (data ?? {}) as never,
  };
  await supabase.from("notifications").insert(row);
}

