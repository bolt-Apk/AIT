import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALLOWED_ORIGINS = [
  "https://ai-taip.com",
  "https://www.ai-taip.com",
  "http://localhost:5173",
  "http://localhost:4173",
];

function getSafeReturnUrl(req: Request): string {
  const origin = req.headers.get("Origin") || "";
  if (ALLOWED_ORIGINS.some((allowed) => origin === allowed)) {
    return origin;
  }
  return ALLOWED_ORIGINS[0];
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Недействительный токен авторизации" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { tokens } = body;

    if (!tokens || tokens < 1 || tokens > 10000) {
      return new Response(
        JSON.stringify({ error: "Укажите количество токенов (от 1 до 10000)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amount = tokens;

    const shopId = Deno.env.get("YOOKASSA_SHOP_ID");
    const secretKey = Deno.env.get("YOOKASSA_SECRET_KEY");

    if (!shopId || !secretKey) {
      return new Response(
        JSON.stringify({ error: "Платёжная система не настроена. Обратитесь к администратору." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: payment, error: insertError } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: user.id,
        amount,
        tokens,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !payment) {
      return new Response(
        JSON.stringify({ error: "Не удалось создать платёж" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const returnUrl = getSafeReturnUrl(req);

    const yooPayload = {
      amount: {
        value: amount.toFixed(2),
        currency: "RUB",
      },
      confirmation: {
        type: "redirect",
        return_url: `${returnUrl}/settings?payment=success`,
      },
      capture: true,
      description: `Покупка ${tokens} токенов для AI-taip.com`,
      metadata: {
        payment_id: payment.id,
        user_id: user.id,
        tokens: tokens,
      },
    };

    const idempotenceKey = payment.id;

    const yooResponse = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${shopId}:${secretKey}`)}`,
        "Content-Type": "application/json",
        "Idempotence-Key": idempotenceKey,
      },
      body: JSON.stringify(yooPayload),
    });

    if (!yooResponse.ok) {
      console.error("YooKassa error:", await yooResponse.text());
      return new Response(
        JSON.stringify({ error: "Не удалось создать платёж в платёжной системе. Попробуйте позже." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const yooResult = await yooResponse.json();

    await supabaseAdmin
      .from("payments")
      .update({ yookassa_id: yooResult.id })
      .eq("id", payment.id);

    return new Response(
      JSON.stringify({
        payment_url: yooResult.confirmation.confirmation_url,
        payment_id: payment.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-payment error:", err);
    return new Response(
      JSON.stringify({ error: "Внутренняя ошибка сервера" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
