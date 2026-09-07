import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MIN_IMAGE_COST = 2;

// Base (cheapest-settings) price per image in roubles, and the highest image count
// the model accepts. Mirrors src/components/ImageModelSelector.tsx.
const IMAGE_MODELS: Record<string, { unit: number; maxN: number }> = {
  "gpt-image-2": { unit: 1.53, maxN: 10 },
  "gpt-image-1": { unit: 2.04, maxN: 10 },
  "gpt-image-1-mini": { unit: 0.41, maxN: 10 },
  "muse-image": { unit: 1.7, maxN: 1 },
  "gemini-3.1-flash-image": { unit: 5.1, maxN: 1 },
  "gemini-3.1-flash-lite-image": { unit: 2.89, maxN: 1 },
  "gemini-3-pro-image": { unit: 11.9, maxN: 1 },
  "gemini-2.5-flash-image": { unit: 5.95, maxN: 1 },
  "seedream-5-0-lite": { unit: 5.95, maxN: 4 },
  "seedream-5-0-pro": { unit: 7.65, maxN: 1 },
  "seedream-4.5": { unit: 6.8, maxN: 10 },
  "flux.2-klein-4b": { unit: 2.55, maxN: 1 },
  "flux.2-pro": { unit: 5.44, maxN: 1 },
  "flux.2-max": { unit: 12.58, maxN: 1 },
  "flux.2-flex": { unit: 10.71, maxN: 1 },
  "grok-imagine-image-2.0": { unit: 6.8, maxN: 1 },
  "grok-imagine-image-quality": { unit: 8.5, maxN: 1 },
  "recraft-v4.1": { unit: 5.95, maxN: 6 },
  "recraft-v4.1-pro": { unit: 35.7, maxN: 6 },
  "recraft-v4.1-utility": { unit: 5.95, maxN: 6 },
  "recraft-v4.1-utility-pro": { unit: 35.7, maxN: 6 },
  "riverflow-v2.5-fast": { unit: 3.23, maxN: 1 },
  "riverflow-v2.5-pro": { unit: 22.1, maxN: 1 },
  "krea-2-medium": { unit: 5.1, maxN: 1 },
  "krea-2-large": { unit: 10.2, maxN: 1 },
  "qwen-image-3-pro": { unit: 6.8, maxN: 6 },
  "qwen-image-3": { unit: 5.1, maxN: 6 },
};

const UNKNOWN_MODEL_UNIT = 12;
const HARD_MAX_N = 10;
// Quality and resolution upgrades multiply the base price; require the balance to
// cover the worst case before the provider is asked to do (and bill for) the work.
const WORST_CASE_MULTIPLIER = 4;

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
    const { model, prompt, n, resolution, aspect_ratio, quality, size, input_references } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Необходимо указать текстовый запрос (prompt)" }),
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

    const usedModel = model || "gpt-image-1";
    const modelLimits = IMAGE_MODELS[usedModel];
    const requestedN = Number(n);
    const usedN = Math.min(
      modelLimits?.maxN ?? 1,
      HARD_MAX_N,
      Math.max(1, Number.isFinite(requestedN) ? Math.floor(requestedN) : 1),
    );
    const worstCaseCost =
      (modelLimits?.unit ?? UNKNOWN_MODEL_UNIT) * WORST_CASE_MULTIPLIER * usedN;

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

      const requiredBalance = Math.max(MIN_IMAGE_COST, worstCaseCost);
      if (bd.tokens < requiredBalance) {
        return new Response(
          JSON.stringify({
            error: `Недостаточно средств: для этого запроса нужно не менее ${requiredBalance.toFixed(2)} ₽. Пополните баланс в настройках.`,
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      balanceData = bd;
    }

    const apiKey = await getApiKey();
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Сервис генерации временно недоступен. Обратитесь к администратору." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: Record<string, unknown> = {
      model: usedModel,
      prompt,
    };

    if (usedN > 1) payload.n = usedN;
    if (resolution) payload.resolution = resolution;
    if (aspect_ratio) payload.aspect_ratio = aspect_ratio;
    if (quality) payload.quality = quality;
    if (size) payload.size = size;
    if (input_references && input_references.length > 0) {
      payload.input_references = input_references;
    }

    const response = await fetch("https://api.aitunnel.ru/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`generate-image upstream error (HTTP ${response.status}):`, errText);
      const filtered = /filtered|sensitive|safety|moderation/i.test(errText);
      let upstreamMsg = "";
      try {
        const errJson = JSON.parse(errText);
        upstreamMsg = errJson?.error?.message || errJson?.error || errJson?.message || "";
      } catch { /* not json */ }
      return new Response(
        JSON.stringify({
          error: filtered
            ? "Запрос отклонён системой безопасности. Попробуйте изменить описание."
            : upstreamMsg || "Не удалось сгенерировать изображение. Попробуйте ещё раз или выберите другую модель.",
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();

    const costRubles = result.usage?.cost_rub ?? 5;

    let newBalance: number | null = null;
    if (!freeMode) {
      const { data: nb, error: deductError } = await supabaseAdmin.rpc("deduct_tokens", {
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
      newBalance = nb;
    }

    if (result.data && Array.isArray(result.data)) {
      for (let i = 0; i < result.data.length; i++) {
        const item = result.data[i];
        if (item.b64_json) {
          const binaryStr = atob(item.b64_json);
          const bytes = new Uint8Array(binaryStr.length);
          for (let j = 0; j < binaryStr.length; j++) bytes[j] = binaryStr.charCodeAt(j);
          
          const ext = (item.media_type || "image/png").includes("webp") ? "webp" : "png";
          const fileName = `${user.id}/${crypto.randomUUID()}.${ext}`;
          
          const { error: uploadError } = await supabaseAdmin.storage
            .from("generated-images")
            .upload(fileName, bytes.buffer, {
              contentType: item.media_type || "image/png",
              upsert: false,
            });
          
          if (!uploadError) {
            const { data: urlData } = supabaseAdmin.storage
              .from("generated-images")
              .getPublicUrl(fileName);
            item.storage_url = urlData.publicUrl;
          }
        }
      }
    }

    result.tokens_remaining = freeMode ? 999999 : (newBalance ?? Math.max(0, (balanceData?.tokens ?? 0) - costRubles));
    result.cost_rubles = costRubles;

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-image error:", err);
    return new Response(
      JSON.stringify({ error: "Внутренняя ошибка сервера" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
