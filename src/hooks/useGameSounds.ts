import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SfxKind = "tick" | "win" | "lose" | "correct" | "wrong";

const STORAGE_KEY = "matchPlayer.muted";
const sessionCache = new Map<SfxKind, string>(); // dataURI per kind

export function useGameSounds(preload: SfxKind[] = ["tick", "win", "lose"]) {
  const [muted, setMutedState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });
  const audioPool = useRef<Map<SfxKind, HTMLAudioElement>>(new Map());

  const setMuted = useCallback((v: boolean) => {
    setMutedState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {}
  }, []);

  const fetchSound = useCallback(async (kind: SfxKind): Promise<string | null> => {
    if (sessionCache.has(kind)) return sessionCache.get(kind)!;
    try {
      const { data, error } = await supabase.functions.invoke("elevenlabs-sfx", {
        body: { kind },
      });
      if (error || !data?.audioContent) return null;
      const url = `data:audio/mpeg;base64,${data.audioContent}`;
      sessionCache.set(kind, url);
      return url;
    } catch {
      return null;
    }
  }, []);

  // Preload on mount
  useEffect(() => {
    preload.forEach(async (k) => {
      const url = await fetchSound(k);
      if (url && !audioPool.current.has(k)) {
        const a = new Audio(url);
        a.preload = "auto";
        audioPool.current.set(k, a);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const play = useCallback(
    async (kind: SfxKind, volume = 0.6) => {
      if (muted) return;
      let a = audioPool.current.get(kind);
      if (!a) {
        const url = await fetchSound(kind);
        if (!url) return;
        a = new Audio(url);
        audioPool.current.set(kind, a);
      }
      try {
        a.currentTime = 0;
        a.volume = volume;
        await a.play();
      } catch {
        // autoplay blocked — silent fail
      }
    },
    [muted, fetchSound]
  );

  return { muted, setMuted, play };
}
