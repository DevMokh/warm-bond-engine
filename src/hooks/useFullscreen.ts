import { useCallback, useEffect, useRef, useState } from "react";

type FsElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
  webkitEnterFullscreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
};
type FsDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
  msFullscreenElement?: Element | null;
  msExitFullscreen?: () => Promise<void>;
};

export function useFullscreen<T extends HTMLElement = HTMLDivElement>(opts?: { autoOnFirstGesture?: boolean }) {
  const ref = useRef<T | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fallback, setFallback] = useState(false); // CSS overlay fallback (iOS Safari)

  const getFsEl = () => {
    const d = document as FsDoc;
    return d.fullscreenElement || d.webkitFullscreenElement || d.msFullscreenElement || null;
  };

  const toggle = useCallback(async () => {
    const el = ref.current as FsElement | null;
    if (!el) return;
    const d = document as FsDoc;
    try {
      if (!getFsEl() && !fallback) {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
        else if (el.webkitEnterFullscreen) await el.webkitEnterFullscreen();
        else if (el.msRequestFullscreen) await el.msRequestFullscreen();
        else {
          // CSS fallback
          setFallback(true);
          setIsFullscreen(true);
          document.body.style.overflow = "hidden";
          return;
        }
        setIsFullscreen(true);
      } else {
        if (fallback) {
          setFallback(false);
          setIsFullscreen(false);
          document.body.style.overflow = "";
          return;
        }
        if (d.exitFullscreen) await d.exitFullscreen();
        else if (d.webkitExitFullscreen) await d.webkitExitFullscreen();
        else if (d.msExitFullscreen) await d.msExitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // CSS fallback on any failure
      setFallback(true);
      setIsFullscreen(true);
      document.body.style.overflow = "hidden";
    }
  }, [fallback]);

  useEffect(() => {
    const onFs = () => {
      if (!fallback) setIsFullscreen(!!getFsEl());
    };
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs as EventListener);
    };
  }, [fallback]);

  // Apply CSS overlay class when fallback active
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (fallback) {
      el.classList.add("fs-fallback");
    } else {
      el.classList.remove("fs-fallback");
    }
  }, [fallback]);

  // Auto-enter fullscreen on first user gesture (browser policy requires a gesture).
  // SKIP entirely when running as installed PWA (display-mode: standalone) — the app
  // is already immersive there, and calling the Fullscreen API on top of standalone
  // mode causes blank/black screens on some Android builds.
  useEffect(() => {
    if (!opts?.autoOnFirstGesture) return;
    // Detect standalone PWA / installed app — skip auto-fullscreen.
    const isStandalone =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(display-mode: standalone)").matches ||
        window.matchMedia?.("(display-mode: fullscreen)").matches ||
        // iOS Safari legacy
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true);
    if (isStandalone) return;

    let used = false;
    const handler = () => {
      if (used) return;
      used = true;
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
      if (!ref.current || getFsEl() || fallback) return;
      toggle().then(() => {
        try {
          const so = (screen as Screen & { orientation?: { lock?: (o: string) => Promise<void> } }).orientation;
          so?.lock?.("portrait").catch(() => {});
        } catch { /* noop */ }
      }).catch(() => {});
    };
    window.addEventListener("pointerdown", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    window.addEventListener("touchstart", handler, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts?.autoOnFirstGesture]);

  return { ref, isFullscreen, toggle, fallback };
}

