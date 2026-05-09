import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRESETS: Record<string, { text: string; duration_seconds: number }> = {
  tick: { text: "short subtle clock tick, single soft click, minimal", duration_seconds: 0.5 },
  win: { text: "short cheerful victory fanfare, bright bells and chimes, celebratory game win sound", duration_seconds: 2 },
  lose: { text: "short sad descending tone, game over fail sound, soft and short", duration_seconds: 1.5 },
  correct: { text: "short positive ding, correct answer feedback, bright bell", duration_seconds: 0.6 },
  wrong: { text: "short low buzz, wrong answer feedback, soft negative tone", duration_seconds: 0.6 },
};

// In-memory cache (per cold start)
const cache = new Map<string, string>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");

    const { kind } = await req.json();
    const preset = PRESETS[kind as string];
    if (!preset) {
      return new Response(JSON.stringify({ error: "invalid kind" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (cache.has(kind)) {
      return new Response(JSON.stringify({ audioContent: cache.get(kind), cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const r = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: preset.text,
        duration_seconds: preset.duration_seconds,
        prompt_influence: 0.5,
      }),
    });
    if (!r.ok) {
      const err = await r.text();
      console.error(`ElevenLabs ${r.status}:`, err);
      const isAuth = r.status === 401 || r.status === 403;
      return new Response(
        JSON.stringify({
          audioContent: null,
          disabled: isAuth,
          error: isAuth ? "ELEVENLABS_AUTH_ERROR" : "SERVICE_UNAVAILABLE",
          message: err,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const buf = await r.arrayBuffer();
    const b64 = base64Encode(new Uint8Array(buf));
    cache.set(kind, b64);

    return new Response(JSON.stringify({ audioContent: b64, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("SFX function error:", msg);
    return new Response(
      JSON.stringify({ audioContent: null, error: "SERVICE_FAILED", message: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
