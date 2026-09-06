import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function verifyWebhookSignature(body: string, req: Request): Promise<boolean> {
  const secret = Deno.env.get("YOOKASSA_SECRET_KEY");
  if (!secret) return false;

  const signature = req.headers.get("X-Webhook-Signature") ||
                    req.headers.get("x-webhook-signature");

  if (!signature) {
    const shopId = Deno.env.get("YOOKASSA_SHOP_ID");
    if (!shopId) return false;
    let parsed;
    try { parsed = JSON.parse(body); } catch { return false; }
    const yookassaId = parsed?.object?.id;
    if (!yookassaId || typeof yookassaId !== "string") return false;

    const verifyRes = await fetch(
      `https://api.yookassa.ru/v3/payments/${encodeURIComponent(yookassaId)}`,
      {
        headers: {
          Authorization: `Basic ${btoa(`${shopId}:${secret}`)}`,
        },
      },
    );
    if (!verifyRes.ok) return false;
    const payment = await verifyRes.json();
    return payment.status === parsed.object?.status;
  }

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expected.length !== signature.length) return false;
  const a = enc.encode(expected);
  const b = enc.encode(signature);
  if (a.byteLength !== b.byteLength) return false;
  const result = new Uint8Array(a.byteLength);
  for (let i = 0; i < a.byteLength; i++) result[i] = a[i] ^ b[i];
  return result.every((v) => v === 0);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const bodyText = await req.text();
    const isValid = await verifyWebhookSignature(bodyText, req);
    if (!isValid) {
      console.error("Webhook signature verification failed");
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = JSON.parse(bodyText);
    const event = body.event;

    if (event !== "payment.succeeded" && event !== "payment.canceled") {
      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentObject = body.object;
    if (!paymentObject || !paymentObject.id) {
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const yookassaId = paymentObject.id;

    const { data: payment, error: findError } = await supabaseAdmin
      .from("payments")
      .select("id, user_id, tokens, status")
      .eq("yookassa_id", yookassaId)
      .maybeSingle();

    if (findError || !payment) {
      const metadata = paymentObject.metadata;
      if (!metadata?.payment_id) {
        return new Response(
          JSON.stringify({ error: "Payment not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: paymentByMeta } = await supabaseAdmin
        .from("payments")
        .select("id, user_id, tokens, status")
        .eq("id", metadata.payment_id)
        .maybeSingle();

      if (!paymentByMeta) {
        return new Response(
          JSON.stringify({ error: "Payment not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await processPayment(supabaseAdmin, paymentByMeta, event, yookassaId);

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await processPayment(supabaseAdmin, payment, event, yookassaId);

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processPayment(
  supabase: ReturnType<typeof createClient>,
  payment: { id: string; user_id: string; tokens: number; status: string },
  event: string,
  yookassaId: string,
) {
  if (event === "payment.succeeded") {
    const { data: updated, error: updateErr } = await supabase
      .from("payments")
      .update({ status: "succeeded", yookassa_id: yookassaId, updated_at: new Date().toISOString() })
      .eq("id", payment.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (updateErr || !updated) {
      return;
    }

    await supabase.rpc("add_tokens", {
      p_user_id: payment.user_id,
      p_amount: payment.tokens,
    });
  } else if (event === "payment.canceled") {
    await supabase
      .from("payments")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("id", payment.id)
      .eq("status", "pending");
  }
}
