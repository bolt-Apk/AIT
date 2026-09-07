import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function getApiKey(): Promise<string | null> {
  const envKey = Deno.env.get("AITUNNEL_API_KEY");
  if (envKey) return envKey;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data } = await supabase
    .from("app_settings")
    .select("aitunnel_api_key")
    .eq("id", 1)
    .maybeSingle();
  return data?.aitunnel_api_key || null;
}

// Never sign with the service-role key itself: if a dedicated secret is not
// configured, derive a key from it so the database master credential is never used
// directly as signing material.
const SIGNING_KEY_LABEL = "avirond:video-proxy:signing:v1";

let derivedSecretPromise: Promise<string> | null = null;

async function getSigningSecret(): Promise<string> {
  const dedicated = Deno.env.get("VIDEO_PROXY_SIGNING_SECRET");
  if (dedicated) return dedicated;

  if (!derivedSecretPromise) {
    derivedSecretPromise = (async () => {
      const root = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const derived = await computeHmac(SIGNING_KEY_LABEL, root);
      return bytesToHex(derived);
    })();
  }
  return derivedSecretPromise;
}

async function computeHmac(data: string, secret: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return new Uint8Array(sig);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(buf: Uint8Array): string {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyToken(id: string, expires: string, token: string): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  if (parseInt(expires, 10) < now) return false;

  const expected = await computeHmac(`${id}:${expires}`, await getSigningSecret());
  const provided = hexToBytes(token);

  if (expected.byteLength !== provided.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < expected.byteLength; i++) {
    diff |= expected[i] ^ provided[i];
  }
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const expires = url.searchParams.get("expires");
    const token = url.searchParams.get("token");

    if (!id || !expires || !token) {
      return new Response("Missing parameters", { status: 400, headers: corsHeaders });
    }

    const valid = await verifyToken(id, expires, token);
    if (!valid) {
      return new Response("Invalid or expired token", { status: 403, headers: corsHeaders });
    }

    const apiKey = await getApiKey();
    if (!apiKey) {
      return new Response("Service unavailable", { status: 503, headers: corsHeaders });
    }

    const upstream = await fetch(
      `https://api.aitunnel.ru/v1/videos/${encodeURIComponent(id)}/content?index=0`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );

    if (!upstream.ok) {
      return new Response("Video not available", {
        status: upstream.status,
        headers: corsHeaders,
      });
    }

    const respHeaders: Record<string, string> = {
      ...corsHeaders,
      "Cache-Control": "public, max-age=86400",
    };
    const ct = upstream.headers.get("Content-Type");
    if (ct) respHeaders["Content-Type"] = ct;
    else respHeaders["Content-Type"] = "video/mp4";
    const cl = upstream.headers.get("Content-Length");
    if (cl) respHeaders["Content-Length"] = cl;

    return new Response(upstream.body, { headers: respHeaders });
  } catch {
    return new Response("Internal server error", { status: 500, headers: corsHeaders });
  }
});
