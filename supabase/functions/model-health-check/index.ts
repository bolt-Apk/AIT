import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function getSupabaseAdmin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

function getSupabaseUser(authHeader: string) {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
}

async function getApiKey(): Promise<string | null> {
  const envKey = Deno.env.get("AITUNNEL_API_KEY");
  if (envKey) return envKey;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("app_settings").select("aitunnel_api_key").eq("id", 1).maybeSingle();
  return data?.aitunnel_api_key || null;
}

interface ModelCheck {
  id: string;
  name: string;
  category: "chat" | "image" | "tts" | "video";
  status: "ok" | "error" | "timeout";
  latencyMs: number;
  error?: string;
}

const CHAT_MODELS = [
  "gpt-5", "gpt-5-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-4o", "gpt-4o-mini",
  "o3", "o3-mini", "o4-mini",
  "claude-opus-5", "claude-sonnet-5", "claude-sonnet-4", "claude-haiku-4.5",
  "gemini-2.5-pro", "gemini-2.5-flash", "gemini-3.7-flash", "gemini-3.5-flash",
  "deepseek-v4-pro-0813", "deepseek-r1", "deepseek-chat",
  "llama-4-maverick", "llama-4-scout", "llama-3.3-70b-instruct",
  "mistral-large-2512", "mistral-medium-3-5", "mistral-small-2603", "codestral-2508",
  "qwen3.8-flash", "qwen3.8-27b",
  "grok-4.6", "grok-4.5", "grok-4.3",
];

const IMAGE_MODELS = [
  "gpt-image-2", "gpt-image-1", "gpt-image-1-mini",
  "gemini-3.1-flash-image", "gemini-3.1-flash-lite-image", "gemini-3-pro-image", "gemini-2.5-flash-image",
  "seedream-5-0-lite", "seedream-5-0-pro", "seedream-4.5",
  "flux.2-klein-4b", "flux.2-pro", "flux.2-max", "flux.2-flex",
  "grok-imagine-image-2.0", "grok-imagine-image-quality",
  "recraft-v4.1", "recraft-v4.1-pro",
  "krea-2-medium", "krea-2-large",
  "qwen-image-3-pro", "qwen-image-3",
];

const TTS_MODELS = [
  "gpt-4o-mini-tts", "tts-1", "tts-1-hd",
  "grok-voice-tts-1.0", "gemini-3.1-flash-tts-preview",
  "voxtral-mini-tts-2603", "aura-2",
  "mai-voice-2-flash", "mai-voice-2",
  "qwen-audio-3.0-tts-plus", "qwen-audio-3.0-tts-flash",
  "speech-2.8-turbo", "speech-2.8-hd",
  "zonos-v0.1-transformer", "orpheus-3b-0.1-ft", "kokoro-82m",
];

const VIDEO_MODELS = [
  "veo-3.1", "veo-3.1-fast", "veo-3.1-lite",
  "kling-v3.0-pro", "kling-v3.0-std", "kling-video-o1",
  "sora-2-pro", "wan-3.0",
  "seedance-2.5", "seedance-2.0", "seedance-2.0-fast",
  "hailuo-3", "hailuo-2.3",
  "gen-4.5", "aleph-2",
  "grok-imagine-video-1.5", "grok-imagine-video",
];

async function checkChatModel(apiKey: string, modelId: string): Promise<ModelCheck> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 15000);
    const res = await fetch("https://api.aitunnel.ru/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelId, messages: [{ role: "user", content: "Hi" }], max_tokens: 5 }),
      signal: controller.signal,
    });
    clearTimeout(tid);
    const latencyMs = Date.now() - start;
    if (res.status >= 500) {
      const err = await res.text().catch(() => "");
      return { id: modelId, name: modelId, category: "chat", status: "error", latencyMs, error: `HTTP ${res.status}: ${err.slice(0, 200)}` };
    }
    // 2xx = success, 4xx = API reachable (bad request / auth / model-specific rejection) — model is alive
    return { id: modelId, name: modelId, category: "chat", status: "ok", latencyMs };
  } catch (e) {
    const latencyMs = Date.now() - start;
    const isTimeout = (e as Error).name === "AbortError";
    return { id: modelId, name: modelId, category: "chat", status: isTimeout ? "timeout" : "error", latencyMs, error: (e as Error).message };
  }
}

async function checkImageModel(apiKey: string, modelId: string): Promise<ModelCheck> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 180000);
    const res = await fetch("https://api.aitunnel.ru/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelId, prompt: "test", n: 1, size: "1024x1024" }),
      signal: controller.signal,
    });
    clearTimeout(tid);
    const latencyMs = Date.now() - start;
    if (res.status >= 500) {
      const err = await res.text().catch(() => "");
      return { id: modelId, name: modelId, category: "image", status: "error", latencyMs, error: `HTTP ${res.status}: ${err.slice(0, 200)}` };
    }
    return { id: modelId, name: modelId, category: "image", status: "ok", latencyMs };
  } catch (e) {
    const latencyMs = Date.now() - start;
    const isTimeout = (e as Error).name === "AbortError";
    return { id: modelId, name: modelId, category: "image", status: isTimeout ? "timeout" : "error", latencyMs, error: (e as Error).message };
  }
}

async function checkTTSModel(apiKey: string, modelId: string): Promise<ModelCheck> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 20000);
    const res = await fetch("https://api.aitunnel.ru/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelId, input: "test", voice: "alloy" }),
      signal: controller.signal,
    });
    clearTimeout(tid);
    const latencyMs = Date.now() - start;
    if (res.status >= 500) {
      const err = await res.text().catch(() => "");
      return { id: modelId, name: modelId, category: "tts", status: "error", latencyMs, error: `HTTP ${res.status}: ${err.slice(0, 200)}` };
    }
    return { id: modelId, name: modelId, category: "tts", status: "ok", latencyMs };
  } catch (e) {
    const latencyMs = Date.now() - start;
    const isTimeout = (e as Error).name === "AbortError";
    return { id: modelId, name: modelId, category: "tts", status: isTimeout ? "timeout" : "error", latencyMs, error: (e as Error).message };
  }
}

async function checkVideoModel(apiKey: string, modelId: string): Promise<ModelCheck> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 20000);
    // Video models: just check if the API accepts the request (will return task_id or error)
    const res = await fetch("https://api.aitunnel.ru/v1/video/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelId, prompt: "test", duration: 5 }),
      signal: controller.signal,
    });
    clearTimeout(tid);
    const latencyMs = Date.now() - start;
    if (res.status >= 500) {
      const err = await res.text().catch(() => "");
      return { id: modelId, name: modelId, category: "video", status: "error", latencyMs, error: `HTTP ${res.status}: ${err.slice(0, 200)}` };
    }
    return { id: modelId, name: modelId, category: "video", status: "ok", latencyMs };
  } catch (e) {
    const latencyMs = Date.now() - start;
    const isTimeout = (e as Error).name === "AbortError";
    return { id: modelId, name: modelId, category: "video", status: isTimeout ? "timeout" : "error", latencyMs, error: (e as Error).message };
  }
}

async function sendEmailAlert(adminEmail: string, failedModels: ModelCheck[]) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey || !adminEmail) return;

  const lines = failedModels.map(m => `- ${m.id} (${m.category}): ${m.error || m.status}`).join("\n");
  const html = `
    <h2 style="color:#ef4444">Внимание: обнаружены неработающие модели</h2>
    <p>Время проверки: ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}</p>
    <table style="border-collapse:collapse;width:100%">
      <tr style="background:#1e293b;color:#fff"><th style="padding:8px;text-align:left">Модель</th><th style="padding:8px">Категория</th><th style="padding:8px">Ошибка</th></tr>
      ${failedModels.map(m => `<tr style="border-bottom:1px solid #334155"><td style="padding:8px;color:#f87171;font-weight:600">${m.id}</td><td style="padding:8px;text-align:center">${m.category}</td><td style="padding:8px;color:#94a3b8;font-size:12px">${m.error || m.status}</td></tr>`).join("")}
    </table>
    <p style="color:#64748b;font-size:12px;margin-top:16px">AI-taip Model Monitor</p>
  `;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "AI-taip Monitor <monitor@AI-taip.com>",
        to: adminEmail,
        subject: `[AI-taip] ${failedModels.length} модел${failedModels.length === 1 ? "ь" : failedModels.length < 5 ? "и" : "ей"} не работа${failedModels.length === 1 ? "ет" : "ют"}`,
        html,
      }),
    });
  } catch {
    // email sending is best-effort
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify admin
    const userClient = getSupabaseUser(authHeader);
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = getSupabaseAdmin();
    const { data: adminRow } = await admin.from("admin_users").select("id").eq("id", user.id).maybeSingle();
    if (!adminRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = await getApiKey();
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = new URL(req.url);
    const category = url.searchParams.get("category") || "all";

    let models: Promise<ModelCheck>[] = [];

    if (category === "all" || category === "chat") {
      models.push(...CHAT_MODELS.map(m => checkChatModel(apiKey, m)));
    }
    if (category === "all" || category === "image") {
      models.push(...IMAGE_MODELS.map(m => checkImageModel(apiKey, m)));
    }
    if (category === "all" || category === "tts") {
      models.push(...TTS_MODELS.map(m => checkTTSModel(apiKey, m)));
    }
    if (category === "all" || category === "video") {
      models.push(...VIDEO_MODELS.map(m => checkVideoModel(apiKey, m)));
    }

    const results = await Promise.all(models);
    const failed = results.filter(r => r.status !== "ok");

    // Send email alert if there are failures
    if (failed.length > 0) {
      const adminEmail = user.email;
      if (adminEmail) {
        await sendEmailAlert(adminEmail, failed);
      }
    }

    return new Response(JSON.stringify({
      timestamp: new Date().toISOString(),
      total: results.length,
      ok: results.filter(r => r.status === "ok").length,
      failed: failed.length,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
