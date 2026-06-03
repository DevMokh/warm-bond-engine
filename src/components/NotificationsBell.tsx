import { Bell, Check, Trash2, Swords, Eye, Hand, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";

const iconFor = (t: string) => {
  if (t === "challenge") return Swords;
  if (t === "spectator") return Eye;
  if (t === "your_turn") return Hand;
  return Info;
};

const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "الآن";
  if (s < 3600) return `${Math.floor(s / 60)} د`;
  if (s < 86400) return `${Math.floor(s / 3600)} س`;
  return `${Math.floor(s / 86400)} يوم`;
};

type Props = {
  /** Tighter style for mobile bottom-bar usage. */
  compact?: boolean;
};

export const NotificationsBell = ({ compact }: Props) => {
  const { items, unreadCount, perm, request, markRead, markAllRead, supported } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "sm" : "icon"}
          className={cn("relative", compact && "flex flex-col items-center gap-1 px-3 py-2 h-auto rounded-lg text-xs text-muted-foreground")}
          aria-label="الإشعارات"
        >
          <Bell className={cn(compact ? "h-5 w-5" : "h-5 w-5")} />
          {compact && <span className="text-[10px]">إشعارات</span>}
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="font-bold">الإشعارات</span>
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={markAllRead}>
              <Check className="h-3 w-3" /> اقرأ الكل
            </Button>
          )}
        </div>

        {supported && perm === "default" && (
          <div className="p-3 bg-primary/10 border-b text-sm space-y-2">
            <p className="font-semibold">فعّل الإشعارات</p>
            <p className="text-xs text-muted-foreground">عشان يجيلك تنبيه لما حد يتحداك أو يدخل يتفرّج عليك حتى وأنت بره اللعبة.</p>
            <Button size="sm" className="w-full" onClick={request}>اسمح بالإشعارات</Button>
          </div>
        )}
        {supported && perm === "denied" && (
          <div className="p-3 bg-destructive/10 border-b text-xs text-muted-foreground">
            الإشعارات معطّلة من المتصفح. روح إعدادات الموقع وفعّلها.
          </div>
        )}

        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              مفيش إشعارات لسه
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const Icon = iconFor(n.type);
                return (
                  <li
                    key={n.id}
                    className={cn("p-3 hover:bg-secondary/40 cursor-pointer transition-colors", !n.read_at && "bg-primary/5")}
                    onClick={() => {
                      markRead(n.id);
                      const url = (n.data?.url as string | undefined) || "/matches";
                      setOpen(false);
                      navigate(url);
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                        n.type === "challenge" ? "bg-destructive/15 text-destructive" :
                        n.type === "spectator" ? "bg-primary/15 text-primary" :
                        n.type === "your_turn" ? "bg-warning/15 text-warning" :
                        "bg-muted text-muted-foreground",
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm truncate">{n.title}</span>
                          {!n.read_at && <Badge variant="default" className="h-1.5 w-1.5 p-0 rounded-full" />}
                        </div>
                        {n.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
