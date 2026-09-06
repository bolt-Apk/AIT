import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  "gpt-5": { input: 25, output: 2000 },
  "gpt-5-mini": { input: 5, output: 400 },
  "gpt-4.1": { input: 100, output: 1600 },
  "gpt-4.1-mini": { input: 20, output: 320 },
  "gpt-4.1-nano": { input: 5, output: 80 },
  "gpt-4o": { input: 250, output: 2000 },
  "gpt-4o-mini": { input: 15, output: 120 },
  "o3": { input: 100, output: 1600 },
  "o3-mini": { input: 110, output: 880 },
  "o4-mini": { input: 55, output: 880 },
  "claude-opus-5": { input: 100, output: 5000 },
  "claude-sonnet-5": { input: 40, output: 2000 },
  "claude-sonnet-4": { input: 60, output: 3000 },
  "claude-haiku-4.5": { input: 20, output: 1000 },
  "gemini-2.5-pro": { input: 25, output: 2000 },
  "gemini-2.5-flash": { input: 6, output: 500 },
  "gemini-3.7-flash": { input: 7.5, output: 375 },
  "gemini-3.5-flash": { input: 30, output: 1800 },
  "deepseek-v4-pro-0813": { input: 4.4, output: 396 },
  "deepseek-v4-flash-vision-exp": { input: 1.4, output: 132 },
  "deepseek-r1": { input: 70, output: 430 },
  "deepseek-chat": { input: 4.18, output: 61.92 },
  "llama-4-maverick": { input: 40, output: 139.2 },
  "llama-4-scout": { input: 20, output: 60 },
  "llama-3.3-70b-instruct": { input: 20, output: 64 },
  "mistral-large-2512": { input: 10, output: 300 },
  "mistral-medium-3-5": { input: 300, output: 1500 },
  "mistral-small-2603": { input: 3, output: 120 },
  "codestral-2508": { input: 6, output: 180 },
  "qwen3.8-flash": { input: 1.2, output: 26 },
  "qwen3.8-27b": { input: 8, output: 600 },
  "qwen3.8-2.4t-a95b": { input: 40, output: 1200 },
  "glm-5.3-flash": { input: 15, output: 50 },
  "glm-5.3": { input: 52.08, output: 880 },
  "grok-4.6": { input: 100, output: 1200 },
  "grok-4.5": { input: 60, output: 1200 },
  "grok-4.3": { input: 21, output: 63 },
  "seed-2-1-turbo": { input: 100, output: 500 },
  "muse-spark-1.2-contributor": { input: 0.4, output: 40 },
};

const DEFAULT_PRICE = { input: 100, output: 1600 };

// The balance must cover the worst case the request can actually produce: the full
// max_tokens reply plus the prompt that was submitted. Gating on a fixed 4096 tokens
// let a caller request 16384 and have the provider bill work the balance never covered.
function getMinBalanceForRequest(
  model: string,
  maxTokens: number,
  promptChars: number,
): number {
  const prices = MODEL_PRICES[model] || DEFAULT_PRICE;
  const outputCost = (maxTokens / 1_000_000) * prices.output;
  const estimatedPromptTokens = Math.ceil(promptChars / 3);
  const inputCost = (estimatedPromptTokens / 1_000_000) * prices.input;
  return Math.max(0.5, outputCost + inputCost);
}

function calculateCostRubles(model: string, promptTokens: number, completionTokens: number): number {
  const prices = MODEL_PRICES[model] || DEFAULT_PRICE;
  const inputCost = (promptTokens / 1_000_000) * prices.input;
  const outputCost = (completionTokens / 1_000_000) * prices.output;
  return inputCost + outputCost;
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
    const { messages, model, temperature, max_tokens, top_p, frequency_penalty, presence_penalty } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Необходимо указать сообщения" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (messages.length > 200) {
      return new Response(
        JSON.stringify({ error: "Слишком много сообщений (максимум 200)" }),
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

    const usedModel = model || "gpt-4.1";
    const usedMaxTokens = typeof max_tokens === "number"
      ? Math.min(16384, Math.max(1, Math.round(max_tokens)))
      : 4096;
    let promptChars = 0;
    try {
      const stripped = JSON.stringify(messages, (_k, v) =>
        typeof v === "string" && v.startsWith("data:") && v.length > 1000
          ? `data:...(${v.length} chars)`
          : v
      );
      promptChars = stripped.length;
    } catch {
      promptChars = 0;
    }

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

      const minBalance = getMinBalanceForRequest(usedModel, usedMaxTokens, promptChars);
      if (bd.tokens < minBalance) {
        return new Response(
          JSON.stringify({ error: `Недостаточно средств: для этого запроса нужно не менее ${minBalance.toFixed(2)} ₽. Пополните баланс в настройках.` }),
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

    const payload: Record<string, unknown> = {
      model: usedModel,
      messages,
      max_tokens: usedMaxTokens,
      temperature: typeof temperature === 'number' ? Math.min(2, Math.max(0, temperature)) : 0.7,
    };
    if (typeof top_p === 'number') payload.top_p = Math.min(1, Math.max(0, top_p));
    if (typeof frequency_penalty === 'number') payload.frequency_penalty = Math.min(2, Math.max(-2, frequency_penalty));
    if (typeof presence_penalty === 'number') payload.presence_penalty = Math.min(2, Math.max(-2, presence_penalty));

    const response = await fetch("https://api.aitunnel.ru/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`chat-completion upstream error (HTTP ${response.status}):`, errText);
      const filtered = /filtered|sensitive|safety|moderation/i.test(errText);
      return new Response(
        JSON.stringify({
          error: filtered
            ? "Запрос отклонён системой безопасности. Попробуйте переформулировать сообщение."
            : "Не удалось получить ответ. Попробуйте ещё раз или выберите другую модель.",
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();

    const promptTokens = result.usage?.prompt_tokens ?? 0;
    const completionTokens = result.usage?.completion_tokens ?? 0;
    const costRubles = calculateCostRubles(usedModel, promptTokens, completionTokens);

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

      result.tokens_remaining = newBalance ?? Math.max(0, (balanceData?.tokens ?? 0) - costRubles);
    }
    result.cost_rubles = Math.round(costRubles * 10000) / 10000;

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("chat-completion error:", err);
    return new Response(
      JSON.stringify({ error: "Внутренняя ошибка сервера" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
