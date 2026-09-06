import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MODEL_PRICES_PER_MIL: Record<string, number> = {
  "gpt-4o-mini-tts": 3000,
  "tts-1": 3000,
  "tts-1-hd": 6000,
  "grok-voice-tts-1.0": 3000,
  "gemini-3.1-flash-tts-preview": 6000,
  "voxtral-mini-tts-2603": 3200,
  "qwen-audio-3.0-tts-flash": 3000,
  "qwen-audio-3.0-tts-plus": 4000,
  "speech-2.8-turbo": 12000,
  "speech-2.8-hd": 20000,
  "aura-2": 6000,
  "orpheus-3b-0.1-ft": 1400,
  "kokoro-82m": 124,
};

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

function getMinBalanceForModel(model: string): number {
  const pricePerMil = MODEL_PRICES_PER_MIL[model] || 3000;
  return Math.max(0.1, (4096 / 1_000_000) * pricePerMil);
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
    const { text, model, voice, instructions, ref_audio, ref_audio_mime, ref_text } = body;

    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Необходимо указать текст для озвучки" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (text.length > 4096) {
      return new Response(
        JSON.stringify({ error: "Текст слишком длинный (максимум 4096 символов)" }),
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

    const supabaseAdmin = getSupabaseAdmin();

    const { data: settingsRow } = await supabaseAdmin
      .from("app_settings")
      .select("free_mode")
      .eq("id", 1)
      .maybeSingle();
    const freeMode = settingsRow?.free_mode === true;

    const usedModel = model || "gpt-4o-mini-tts";
    const usedVoice = voice || "alloy";

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

      const minBalance = getMinBalanceForModel(usedModel);
      if (bd.tokens < minBalance) {
        return new Response(
          JSON.stringify({ error: "Недостаточно средств. Пополните баланс в настройках." }),
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

    const pcmOnlyModels = ["gemini-3.1-flash-tts-preview"];
    const usedFormat = pcmOnlyModels.includes(usedModel) ? "pcm" : "mp3";

    const payload: Record<string, unknown> = {
      model: usedModel,
      input: text,
      response_format: usedFormat,
    };

    const voiceCloneModels = ["voxtral-mini-tts-2603"];

    if (voiceCloneModels.includes(usedModel)) {
      if (!ref_audio || typeof ref_audio !== "string") {
        return new Response(
          JSON.stringify({ error: "Для этой модели необходимо загрузить образец голоса (5-60 сек)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let audioBase64 = ref_audio;
      let audioMime = ref_audio_mime || 'audio/wav';

      if (ref_audio.startsWith("http://") || ref_audio.startsWith("https://")) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const refUrl = new URL(ref_audio);
        const supabaseHost = new URL(supabaseUrl).host;
        if (refUrl.host !== supabaseHost) {
          return new Response(
            JSON.stringify({ error: "Образец голоса можно загружать только из хранилища приложения" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const audioResp = await fetch(ref_audio);
        if (!audioResp.ok) {
          return new Response(
            JSON.stringify({ error: "Не удалось загрузить образец голоса" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        audioMime = audioResp.headers.get('content-type') || audioMime;
        const audioBuffer = await audioResp.arrayBuffer();
        const bytes = new Uint8Array(audioBuffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        audioBase64 = btoa(binary);
      }

      payload.ref_audio = `data:${audioMime};base64,${audioBase64}`;
      if (ref_text && typeof ref_text === "string" && ref_text.trim()) {
        payload.ref_text = ref_text.trim();
      }
      payload.voice = usedVoice || "alloy";
    } else {
      if (!usedVoice || usedVoice.trim() === "") {
        return new Response(
          JSON.stringify({ error: "Необходимо выбрать голос для этой модели" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      payload.voice = usedVoice;
    }

    if (instructions && usedModel === "gpt-4o-mini-tts") {
      payload.instructions = instructions;
    }

    const response = await fetch("https://api.aitunnel.ru/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("TTS API error:", response.status, errText);
      const filtered = /filtered|sensitive|safety|moderation/i.test(errText);
      return new Response(
        JSON.stringify({
          error: filtered
            ? "Текст отклонён системой безопасности. Попробуйте изменить текст."
            : "Не удалось озвучить текст. Попробуйте ещё раз или выберите другой голос.",
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const charCount = text.length;
    const pricePerMil = MODEL_PRICES_PER_MIL[usedModel] || 3000;
    const costRubles = (charCount / 1_000_000) * pricePerMil;

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
    headers.set("Content-Type", usedFormat === "pcm" ? "audio/L16;rate=24000" : "audio/mpeg");
    headers.set("X-Cost-Rubles", String(Math.round(costRubles * 10000) / 10000));
    headers.set("X-Balance-Remaining", String(Math.round(finalBalance * 100) / 100));
    headers.set("Access-Control-Expose-Headers", "X-Cost-Rubles, X-Balance-Remaining");

    return new Response(audioBuffer, { headers });
  } catch (err) {
    console.error("text-to-speech error:", err);
    return new Response(
      JSON.stringify({ error: "Внутренняя ошибка сервера" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
