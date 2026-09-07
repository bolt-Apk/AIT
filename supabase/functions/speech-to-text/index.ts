import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MODEL_PRICES_PER_SECOND: Record<string, number> = {
  "whisper-large-v3-turbo": 0.003,
  "gpt-4o-mini-transcribe": 0.017,
  "voxtral-mini-transcribe": 0.014,
};

const MAX_AUDIO_BASE64_LENGTH = 20_000_000;

// Worst-case seconds of audio per byte of payload, used to require the balance to
// cover the transcription BEFORE the provider is asked to do (and bill for) the work.
// 16 kbit/s is a conservative floor for the compressed formats the app records.
const WORST_CASE_BYTES_PER_SECOND = 2000;

function estimateWorstCaseCost(base64Length: number, model: string): number {
  const approxBytes = base64Length * 0.75;
  const worstCaseSeconds = approxBytes / WORST_CASE_BYTES_PER_SECOND;
  const pricePerSec = MODEL_PRICES_PER_SECOND[model] || 0.017;
  return worstCaseSeconds * pricePerSec;
}

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceRoleKey);
}

function getSupabaseUser(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

async function getApiKey(): Promise<string | null> {
  const envKey = Deno.env.get("AITUNNEL_API_KEY");
  if (envKey) return envKey;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("app_settings")
    .select("aitunnel_api_key")
    .eq("id", 1)
    .maybeSingle();
  return data?.aitunnel_api_key || null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Необходима авторизация" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { audio_data, model, language } = body;

    if (!audio_data || typeof audio_data !== "string") {
      return new Response(
        JSON.stringify({ error: "Необходимо предоставить аудиоданные" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (audio_data.length > MAX_AUDIO_BASE64_LENGTH) {
      return new Response(
        JSON.stringify({ error: "Аудиофайл слишком большой (максимум ~15 МБ)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUser = getSupabaseUser(authHeader);
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Недействительный токен авторизации" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const usedModelForPricing = model || "whisper-large-v3-turbo";
    const worstCaseCost = estimateWorstCaseCost(audio_data.length, usedModelForPricing);

    const supabaseAdmin = getSupabaseAdmin();

    const { data: settingsRow } = await supabaseAdmin
      .from("app_settings")
      .select("free_mode")
      .eq("id", 1)
      .maybeSingle();
    const freeMode = settingsRow?.free_mode === true;

    let balanceData: { tokens: number } | null = null;
    if (!freeMode) {
      const { data: bd, error: balanceError } = await supabaseAdmin
        .from("user_balances")
        .select("tokens")
        .eq("id", user.id)
        .maybeSingle();

      if (balanceError || !bd) {
        return new Response(
          JSON.stringify({ error: "Не удалось проверить баланс" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const requiredBalance = Math.max(0.5, worstCaseCost);
      if (bd.tokens < requiredBalance) {
        return new Response(
          JSON.stringify({ error: `Недостаточно средств: для этого аудио нужно не менее ${requiredBalance.toFixed(2)} ₽. Пополните баланс в настройках.` }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      balanceData = bd;
    }

    const apiKey = await getApiKey();
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Сервис временно недоступен. Обратитесь к администратору." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const usedModel = model || "whisper-large-v3-turbo";

    const rawBase64 = audio_data.includes(",") ? audio_data.split(",")[1] : audio_data;

    const mimeMatch = audio_data.match(/^data:(audio\/[^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : "audio/webm";

    const audioBytes = Uint8Array.from(atob(rawBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([audioBytes], { type: mimeType });

    const formData = new FormData();
    const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("mp3") ? "mp3" : mimeType.includes("wav") ? "wav" : mimeType.includes("mp4") ? "m4a" : "webm";
    formData.append("file", blob, `audio.${ext}`);
    formData.append("model", usedModel);
    if (language) {
      formData.append("language", language);
    }

    const response = await fetch("https://api.aitunnel.ru/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`speech-to-text upstream error (HTTP ${response.status}):`, errText);
      return new Response(
        JSON.stringify({ error: "Не удалось распознать речь. Попробуйте ещё раз или запишите аудио заново." }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();

    const durationSeconds = result.duration ?? 30;
    const pricePerSec = MODEL_PRICES_PER_SECOND[usedModel] || 0.017;
    const costRubles = durationSeconds * pricePerSec;

    let finalBalance = 999999;
    if (!freeMode) {
      const { data: newBalance, error: deductError } = await supabaseAdmin.rpc("deduct_tokens", {
        p_user_id: user.id,
        p_amount: costRubles,
      });

      if (deductError) {
        console.error("deduct_tokens failed:", deductError.message);
        return new Response(
          JSON.stringify({ error: "Не удалось списать средства. Попробуйте ещё раз." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      finalBalance = newBalance ?? Math.max(0, (balanceData?.tokens ?? 0) - costRubles);
    }

    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", "application/json");
    headers.set("X-Cost-Rubles", String(Math.round(costRubles * 10000) / 10000));
    headers.set("X-Balance-Remaining", String(Math.round(finalBalance * 100) / 100));
    headers.set("Access-Control-Expose-Headers", "X-Cost-Rubles, X-Balance-Remaining");

    return new Response(JSON.stringify({
      text: result.text || "",
      duration: durationSeconds,
    }), { headers });
  } catch (err) {
    console.error("speech-to-text error:", err);
    return new Response(
      JSON.stringify({ error: "Внутренняя ошибка сервера" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
