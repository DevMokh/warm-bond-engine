import { useCallback, useEffect, useRef, useState } from "react";

export type SfxKind = "tick" | "win" | "lose" | "correct" | "wrong";

const STORAGE_KEY = "matchPlayer.muted";

// Synthesize all SFX locally with Web Audio API — no network, no API key.
type Note = { f: number; t: number; d: number; type?: OscillatorType; vol?: number };

const PATTERNS: Record<SfxKind, Note[]> = {
  tick: [{ f: 1200, t: 0, d: 0.05, type: "square", vol: 0.15 }],
  correct: [
    { f: 880, t: 0, d: 0.12, type: "triangle", vol: 0.25 },
    { f: 1320, t: 0.1, d: 0.18, type: "triangle", vol: 0.25 },
  ],
  wrong: [
    { f: 220, t: 0, d: 0.18, type: "sawtooth", vol: 0.2 },
    { f: 160, t: 0.15, d: 0.22, type: "sawtooth", vol: 0.2 },
  ],
  win: [
    { f: 523, t: 0, d: 0.14, type: "triangle", vol: 0.25 },
    { f: 659, t: 0.13, d: 0.14, type: "triangle", vol: 0.25 },
    { f: 784, t: 0.26, d: 0.14, type: "triangle", vol: 0.25 },
    { f: 1046, t: 0.39, d: 0.3, type: "triangle", vol: 0.28 },
  ],
  lose: [
    { f: 392, t: 0, d: 0.18, type: "sine", vol: 0.22 },
    { f: 311, t: 0.18, d: 0.22, type: "sine", vol: 0.22 },
    { f: 233, t: 0.4, d: 0.32, type: "sine", vol: 0.22 },
  ],
};

let _ctx: AudioContext | null = null;
const getCtx = () => {
  if (typeof window === "undefined") return null;
  if (!_ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    _ctx = new AC();
  }
  if (_ctx.state === "suspended") _ctx.resume().catch(() => {});
  return _ctx;
};

const playPattern = (kind: SfxKind, masterVol: number) => {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  PATTERNS[kind].forEach((n) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.value = n.f;
    const v = (n.vol ?? 0.2) * masterVol;
    gain.gain.setValueAtTime(0.0001, now + n.t);
    gain.gain.exponentialRampToValueAtTime(v, now + n.t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + n.t);
    osc.stop(now + n.t + n.d + 0.02);
  });
};

export function useGameSounds(_preload: SfxKind[] = []) {
  const [muted, setMutedState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });
  const masterRef = useRef(0.7);

  const setMuted = useCallback((v: boolean) => {
    setMutedState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {}
  }, []);

  // Unlock AudioContext on first user gesture (autoplay policies)
  useEffect(() => {
    const unlock = () => {
      getCtx();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const play = useCallback(
    async (kind: SfxKind, volume = 0.6) => {
      if (muted) return;
      masterRef.current = volume;
      try {
        playPattern(kind, volume);
      } catch {
        // ignore
      }
    },
    [muted],
  );

  return { muted, setMuted, play };
}
