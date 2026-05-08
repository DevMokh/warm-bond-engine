import { useCallback, useEffect, useRef, useState } from "react";

export function useFullscreen<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggle = useCallback(async () => {
    const el = ref.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  return { ref, isFullscreen, toggle };
}
