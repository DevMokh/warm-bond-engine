import { useEffect, useState } from "react";
import { Check, X, Trophy, Activity, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SfxKind } from "@/hooks/useGameSounds";

const META: Record<SfxKind, { label: string; icon: React.ElementType; cls: string }> = {
  correct: { label: "صح", icon: Check, cls: "bg-success/20 text-success border-success/40" },
  wrong:   { label: "غلط", icon: X, cls: "bg-destructive/20 text-destructive border-destructive/40" },
  tick:    { label: "تيك", icon: Activity, cls: "bg-muted text-foreground border-border" },
  win:     { label: "فوز", icon: Trophy, cls: "bg-warning/20 text-warning border-warning/40" },
  lose:    { label: "خسارة", icon: X, cls: "bg-muted text-muted-foreground border-border" },
};

export const SfxIndicator = ({ kind, muted, ts }: { kind: SfxKind | null; muted: boolean; ts: number }) => {
  const [pulse, setPulse] = useState(0);
  useEffect(() => { setPulse((p) => p + 1); }, [ts]);
  if (muted) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-muted text-muted-foreground">
        <VolumeX className="h-3 w-3" /> صوت متوقّف
      </span>
    );
  }
  if (!kind) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-muted/40 text-muted-foreground">
        <Volume2 className="h-3 w-3" /> جاهز
      </span>
    );
  }
  const m = META[kind];
  const Icon = m.icon;
  return (
    <span
      key={pulse}
      className={cn(
        "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border animate-in fade-in zoom-in-95",
        m.cls,
      )}
      title={`آخر صوت: ${m.label}`}
    >
      <Icon className="h-3 w-3" /> {m.label}
    </span>
  );
};
