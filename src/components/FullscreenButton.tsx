import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Standalone fullscreen toggle button. Wire its `onClick`/`active` to
 * a `useFullscreen()` hook in the parent so the parent owns the ref.
 */
export function FullscreenButton({
  active,
  onToggle,
  className,
  size = "icon",
}: {
  active: boolean;
  onToggle: () => void;
  className?: string;
  size?: "icon" | "sm";
}) {
  return (
    <Button
      type="button"
      size={size}
      variant="ghost"
      onClick={onToggle}
      className={cn("h-8 w-8", className)}
      aria-label={active ? "إنهاء ملء الشاشة" : "ملء الشاشة"}
      title={active ? "إنهاء ملء الشاشة" : "ملء الشاشة"}
    >
      {active ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
    </Button>
  );
}
