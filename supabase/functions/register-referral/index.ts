import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Недействительный токен" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { referral_code } = body;

    if (!referral_code || typeof referral_code !== "string") {
      return new Response(
        JSON.stringify({ error: "Не указан реферальный код" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Find the referrer by code
    const { data: referrer } = await supabaseAdmin
      .from("user_balances")
      .select("id, referral_code")
      .eq("referral_code", referral_code)
      .maybeSingle();

    if (!referrer) {
      return new Response(
        JSON.stringify({ error: "Реферальный код не найден" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Can't refer yourself
    if (referrer.id === user.id) {
      return new Response(
        JSON.stringify({ error: "Нельзя использовать собственный код" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already referred
    const { data: existingRef } = await supabaseAdmin
      .from("referrals")
      .select("id")
      .eq("referred_id", user.id)
      .maybeSingle();

    if (existingRef) {
      return new Response(
        JSON.stringify({ ok: true, message: "Реферал уже записан" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create referral record
    await supabaseAdmin
      .from("referrals")
      .insert({ referrer_id: referrer.id, referred_id: user.id });

    // Mark who referred this user
    await supabaseAdmin
      .from("user_balances")
      .update({ referred_by: referrer.id })
      .eq("id", user.id);

    return new Response(
      JSON.stringify({ ok: true, message: "Реферал успешно записан" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("register-referral error:", err);
    return new Response(
      JSON.stringify({ error: "Внутренняя ошибка сервера" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
