import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MODEL_PRICES_PER_SEC: Record<string, number> = {
  "veo-3.1": 102,
  "veo-3.1-fast": 51,
  "veo-3.1-lite": 13.6,
  "kling-v3.0-pro": 28.56,
  "kling-v3.0-std": 28.56,
  "kling-v3.0-turbo": 14.28,
  "kling-video-o1": 19.04,
  "sora-2-pro": 85,
  "wan-3.0": 28.9,
  "wan-2.7": 17,
  "wan-2.6": 25.5,
  "seedance-2.5": 39.54,
  "seedance-2.0": 75.91,
  "seedance-2.0-fast": 26.99,
  "seedance-2.0-mini": 6.75,
  "seedance-1-5-pro": 26.03,
  "hailuo-3": 22.1,
  "hailuo-2.3": 13.89,
  "gen-4.5": 20.4,
  "aleph-2": 47.6,
  "grok-imagine-video-1.5": 42.5,
  "grok-imagine-video": 11.9,
  "flux-3-video": 90.1,
  "avatar-iv": 8.5,
  "happyhorse-1.1": 21.73,
  "happyhorse-1.0": 28.8,
};

const MAX_DURATION = 30;

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

function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  return url;
}

const KNOWN_ERROR_CODES: Record<string, string> = {
  InputImageSensitiveContentDetected: "Изображение содержит недопустимый контент. Попробуйте другое изображение.",
  ContentFiltered: "Контент был отфильтрован системой безопасности. Попробуйте изменить описание.",
  RateLimitExceeded: "Слишком много запросов. Подождите немного и попробуйте снова.",
  InvalidPrompt: "Некорректное описание. Попробуйте переформулировать.",
};

const GENERIC_VIDEO_ERROR = "Не удалось запустить генерацию видео. Попробуйте изменить описание или выбрать другую модель.";

function extractErrorMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    const err = parsed?.error;
    if (typeof err === "string") {
      if (/prompt.{0,20}(too long|length|exceed|limit|max)/i.test(err)) {
        return "Описание слишком длинное для этой модели. Сократите текст и попробуйте снова.";
      }
      if (/filtered|sensitive|unsafe|moderation|violat/i.test(err)) {
        return KNOWN_ERROR_CODES.ContentFiltered;
      }
      if (/rate.?limit/i.test(err)) {
        return KNOWN_ERROR_CODES.RateLimitExceeded;
      }
      if (/invalid.{0,10}prompt/i.test(err)) {
        return KNOWN_ERROR_CODES.InvalidPrompt;
      }
    }
    if (err && typeof err !== "string") {
      const code = err.code || "";
      const baseCode = code.split(".")[0];
      if (KNOWN_ERROR_CODES[baseCode]) return KNOWN_ERROR_CODES[baseCode];
      const errMsg = err.message || "";
      if (/prompt.{0,20}(too long|length|exceed|limit|max)/i.test(errMsg)) {
        return "Описание слишком длинное для этой модели. Сократите текст и попробуйте снова.";
      }
      if (/filtered|sensitive|unsafe|moderation|violat/i.test(errMsg)) {
        return KNOWN_ERROR_CODES.ContentFiltered;
      }
    }
  } catch { /* fall through */ }

  if (/prompt.{0,20}(too long|length|exceed|limit|max)/i.test(raw)) {
    return "Описание слишком длинное для этой модели. Сократите текст и попробуйте снова.";
  }
  if (/filtered|sensitive|unsafe|moderation|violat/i.test(raw)) {
    return KNOWN_ERROR_CODES.ContentFiltered;
  }
  if (/rate.?limit/i.test(raw)) {
    return KNOWN_ERROR_CODES.RateLimitExceeded;
  }
  if (/invalid.{0,10}prompt/i.test(raw)) {
    return KNOWN_ERROR_CODES.InvalidPrompt;
  }
  return GENERIC_VIDEO_ERROR;
}

function jsonOk(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(msg: string, status: number) {
  return new Response(
    JSON.stringify({ error: msg }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

async function authenticateUser(authHeader: string) {
  const supabaseUser = getSupabaseUser(authHeader);
  const { data: { user }, error } = await supabaseUser.auth.getUser();
  if (error || !user) return null;
  return user;
}

async function downloadVideoBytes(
  generationId: string,
  apiKey: string,
  unsignedUrls?: string[],
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const sources: Array<{ url: string; needsAuth: boolean }> = [];
  if (unsignedUrls && unsignedUrls.length > 0) {
    for (const u of unsignedUrls) {
      sources.push({ url: u, needsAuth: false });
    }
  }
  sources.push({
    url: `https://api.aitunnel.ru/v1/videos/${encodeURIComponent(generationId)}/content?index=0`,
    needsAuth: true,
  });

  const MAX_RETRIES = 3;
  for (const src of sources) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const headers: Record<string, string> = {};
        if (src.needsAuth) headers["Authorization"] = `Bearer ${apiKey}`;
        const videoRes = await fetch(src.url, { headers });
        if (!videoRes.ok) {
          console.error(`[download] ${src.url.slice(0, 80)} → HTTP ${videoRes.status} (attempt ${attempt + 1})`);
          if (videoRes.status >= 500 && attempt < MAX_RETRIES - 1) {
            await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
            continue;
          }
          break;
        }
        const buf = new Uint8Array(await videoRes.arrayBuffer());
        if (buf.byteLength === 0) {
          if (attempt < MAX_RETRIES - 1) { await new Promise(r => setTimeout(r, 2000)); continue; }
          break;
        }
        const ct = videoRes.headers.get("content-type") || "";
        let contentType = "video/mp4";
        if (ct.includes("video/")) contentType = ct.split(";")[0].trim();
        console.log(`[download] OK ${buf.byteLength} bytes, ${contentType} from ${src.url.slice(0, 80)}`);
        return { bytes: buf, contentType };
      } catch (e) {
        console.error(`[download] error from ${src.url.slice(0, 80)} (attempt ${attempt + 1}):`, e);
        if (attempt < MAX_RETRIES - 1) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
  }
  return null;
}

async function downloadAndStoreVideo(
  generationId: string,
  apiKey: string,
  userId: string,
  unsignedUrls?: string[],
): Promise<string | null> {
  const supabaseAdmin = getSupabaseAdmin();

  const downloaded = await downloadVideoBytes(generationId, apiKey, unsignedUrls);
  if (!downloaded) {
    console.error(`[store] All download sources failed for ${generationId}`);
    return null;
  }

  const ext = downloaded.contentType.includes("webm") ? "webm" : "mp4";
  const storagePath = `${userId}/${generationId}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from("generated-videos")
    .upload(storagePath, downloaded.bytes, {
      contentType: downloaded.contentType,
      upsert: true,
    });

  if (error) {
    console.error("[store] Upload error:", error.message);
    return null;
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from("generated-videos")
    .getPublicUrl(storagePath);

  console.log(`[store] Stored ${storagePath} → ${publicUrlData.publicUrl.slice(0, 80)}`);
  return publicUrlData.publicUrl;
}

async function handleSubmit(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonError("Необходима авторизация", 401);

  const body = await req.json();
  const { prompt, model, duration, aspect_ratio, resolution, size, negative_prompt, first_frame_url, last_frame_url, reference_url, audio_url, reference_urls, video_reference_urls, audio_reference_urls } = body;
  const refUrlsArr: string[] = Array.isArray(reference_urls) ? reference_urls.filter((u: unknown) => typeof u === 'string') : [];
  const videoRefUrlsArr: string[] = Array.isArray(video_reference_urls) ? video_reference_urls.filter((u: unknown) => typeof u === 'string') : [];
  const audioRefUrlsArr: string[] = Array.isArray(audio_reference_urls) ? audio_reference_urls.filter((u: unknown) => typeof u === 'string') : [];

  const hasMedia = !!(first_frame_url || last_frame_url || reference_url || audio_url || refUrlsArr.length || videoRefUrlsArr.length || audioRefUrlsArr.length);
  if ((!prompt || prompt.trim().length === 0) && !hasMedia) {
    return jsonError("Необходимо описать видео или прикрепить медиа", 400);
  }
  if (prompt && prompt.length > 10000) {
    return jsonError("Описание слишком длинное (максимум 10 000 символов)", 400);
  }

  const user = await authenticateUser(authHeader);
  if (!user) return jsonError("Недействительный токен авторизации", 401);

  const supabaseAdmin = getSupabaseAdmin();

  const { data: settingsRow } = await supabaseAdmin
    .from("app_settings")
    .select("free_mode")
    .eq("id", 1)
    .maybeSingle();
  const freeMode = settingsRow?.free_mode === true;

  const usedModel = model || "wan-3.0";
  const usedDuration = Math.min(Math.max(1, duration || 5), MAX_DURATION);
  const pricePerSec = MODEL_PRICES_PER_SEC[usedModel] || 14;
  const estimatedCost = pricePerSec * usedDuration;

  if (!freeMode) {
    const { data: deductResult, error: deductError } = await supabaseAdmin.rpc("deduct_tokens", {
      p_user_id: user.id,
      p_amount: estimatedCost,
    });

    if (deductError) {
      const msg = deductError.message || "";
      if (msg.includes("INSUFFICIENT_BALANCE")) {
        return jsonError(
          `Недостаточно средств. Нужно ~${estimatedCost.toFixed(0)} ₽. Пополните баланс в настройках.`,
          402,
        );
      }
      return jsonError("Не удалось списать средства", 500);
    }
  }

  const apiKey = await getApiKey();
  if (!apiKey) {
    if (!freeMode) {
      await supabaseAdmin.rpc("add_tokens", { p_user_id: user.id, p_amount: estimatedCost });
    }
    return jsonError("Сервис временно недоступен. Обратитесь к администратору.", 503);
  }

  const isAvatar = usedModel === "avatar-iv";

  const resolvedFirst = resolveMediaUrl(first_frame_url);
  const resolvedLast = resolveMediaUrl(last_frame_url);
  const resolvedRef = resolveMediaUrl(reference_url);
  const resolvedAudio = resolveMediaUrl(audio_url);

  const trimmedPrompt = (prompt || "").trim();
  const payload: Record<string, unknown> = {
    model: usedModel,
    prompt: trimmedPrompt || "",
  };

  if (isAvatar) {
    if (resolution) payload.resolution = resolution;
    const refs: Array<Record<string, unknown>> = [];
    const imgUrl = resolvedRef || resolvedFirst;
    if (imgUrl) {
      refs.push({ type: "image_url", image_url: { url: imgUrl } });
    }
    if (resolvedAudio) {
      refs.push({ type: "audio_url", audio_url: { url: resolvedAudio } });
    }
    if (refs.length > 0) payload.input_references = refs;
  } else {
    if (usedDuration) payload.duration = usedDuration;
    if (aspect_ratio) payload.aspect_ratio = aspect_ratio;

    if (size && typeof size === "string" && /^\d+x\d+$/.test(size)) {
      payload.size = size;
    } else if (resolution === "2K" || resolution === "4K") {
      const sizeMap: Record<string, Record<string, string>> = {
        "2K": {
          "21:9": "3360x1440", "16:9": "2560x1440", "4:3": "1920x1440",
          "1:1": "1440x1440", "3:4": "1440x1920", "9:16": "1440x2560",
        },
        "4K": {
          "16:9": "3840x2160", "9:16": "2160x3840",
        },
      };
      const ar = typeof aspect_ratio === "string" ? aspect_ratio : "16:9";
      const pixelSize = sizeMap[resolution]?.[ar] || sizeMap[resolution]?.["16:9"];
      if (pixelSize) payload.size = pixelSize;
      else payload.resolution = resolution;
    } else if (resolution) {
      payload.resolution = resolution;
    }
    if (negative_prompt && typeof negative_prompt === "string" && negative_prompt.trim()) {
      payload.negative_prompt = negative_prompt.trim();
    }

    const frameImages: Array<{ type: string; image_url: { url: string }; frame_type: string }> = [];
    if (resolvedFirst) {
      frameImages.push({ type: "image_url", image_url: { url: resolvedFirst }, frame_type: "first_frame" });
    }
    if (resolvedLast) {
      frameImages.push({ type: "image_url", image_url: { url: resolvedLast }, frame_type: "last_frame" });
    }
    if (frameImages.length > 0) payload.frame_images = frameImages;

    if (resolvedRef) {
      payload.input_references = [
        ...(payload.input_references as Array<Record<string, unknown>> || []),
        { type: "image_url", image_url: { url: resolvedRef } },
      ];
    }
    for (const extraRef of refUrlsArr) {
      const resolved = resolveMediaUrl(extraRef);
      if (resolved) {
        payload.input_references = [
          ...(payload.input_references as Array<Record<string, unknown>> || []),
          { type: "image_url", image_url: { url: resolved } },
        ];
      }
    }
    for (const videoRef of videoRefUrlsArr) {
      const resolved = resolveMediaUrl(videoRef);
      if (resolved) {
        payload.input_references = [
          ...(payload.input_references as Array<Record<string, unknown>> || []),
          { type: "video_url", video_url: { url: resolved } },
        ];
      }
    }
    if (resolvedAudio) {
      payload.input_references = [
        ...(payload.input_references as Array<Record<string, unknown>> || []),
        { type: "audio_url", audio_url: { url: resolvedAudio } },
      ];
    }
    for (const audioRef of audioRefUrlsArr) {
      const resolved = resolveMediaUrl(audioRef);
      if (resolved) {
        payload.input_references = [
          ...(payload.input_references as Array<Record<string, unknown>> || []),
          { type: "audio_url", audio_url: { url: resolved } },
        ];
      }
    }
  }

  const submitRes = await fetch("https://api.aitunnel.ru/v1/videos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const payloadJson = JSON.stringify(payload);
  console.log(`[generate-video] model=${usedModel} payload=${payloadJson.length} bytes, prompt_len=${trimmedPrompt.length}, has_frames=${!!(resolvedFirst||resolvedLast)}, has_ref=${!!resolvedRef}, has_audio=${!!resolvedAudio}`);
  console.log(`[generate-video] payload keys: ${Object.keys(payload).join(', ')}`);

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    console.error(`API error for model ${usedModel} (HTTP ${submitRes.status}):`, errText);
    if (!freeMode) {
      await supabaseAdmin.rpc("add_tokens", { p_user_id: user.id, p_amount: estimatedCost });
    }
    let errMsg = extractErrorMessage(errText);
    try {
      const parsed = JSON.parse(errText);
      const raw = parsed?.error;
      const detail = typeof raw === "string" ? raw : raw?.message || "";
      if (detail && detail.length < 300) {
        errMsg = `${errMsg} (${detail})`;
      }
    } catch { /* use extracted message */ }
    return jsonError(errMsg, submitRes.status);
  }

  const submitData = await submitRes.json();
  const generationId = submitData.id;

  if (!generationId) {
    if (!freeMode) {
      await supabaseAdmin.rpc("add_tokens", { p_user_id: user.id, p_amount: estimatedCost });
    }
    return jsonError("Не удалось запустить генерацию видео", 500);
  }

  await supabaseAdmin
    .from("pending_generations")
    .upsert({
      generation_id: generationId,
      user_id: user.id,
      type: "video",
      prompt: trimmedPrompt.slice(0, 500) || "(media only)",
      model: usedModel,
      duration: usedDuration,
      aspect_ratio: aspect_ratio || null,
      estimated_cost: estimatedCost,
      status: "pending",
    }, { onConflict: "generation_id" })
    .then(({ error }) => { if (error) console.error("pending_generations upsert error:", error); });

  if (submitData.status === "completed") {
    const storageUrl = await downloadAndStoreVideo(generationId, apiKey, user.id, submitData.unsigned_urls);
    if (!storageUrl) return jsonError("Не удалось сохранить видео", 500);

    await supabaseAdmin
      .from("pending_generations")
      .update({ status: "completed", result_url: storageUrl })
      .eq("generation_id", generationId);

    return jsonOk({
      status: "completed",
      generation_id: generationId,
      url: storageUrl,
      cost: freeMode ? 0 : estimatedCost,
      charged: true,
    });
  }

  return jsonOk({
    status: submitData.status || "pending",
    generation_id: generationId,
    estimated_cost: estimatedCost,
    charged: true,
  });
}

async function handlePoll(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonError("Необходима авторизация", 401);

  const url = new URL(req.url);
  const generationId = url.searchParams.get("id");
  if (!generationId) return jsonError("Параметр id обязателен", 400);

  const user = await authenticateUser(authHeader);
  if (!user) return jsonError("Недействительный токен авторизации", 401);

  const apiKey = await getApiKey();
  if (!apiKey) return jsonError("Сервис временно недоступен", 503);

  const res = await fetch(
    `https://api.aitunnel.ru/v1/videos/${encodeURIComponent(generationId)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    },
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error(`[generate-video] status check failed (HTTP ${res.status}):`, errText);
    if (res.status >= 500) {
      return jsonOk({ status: "pending", detail: "Сервер генерации временно недоступен. Повторяем попытку…" });
    }
    return jsonOk({ status: "failed", error: "Не удалось проверить статус генерации. Попробуйте ещё раз." });
  }

  const data = await res.json();

  if (data.status === "completed") {
    const hasUrls = Array.isArray(data.unsigned_urls) && data.unsigned_urls.length > 0;
    if (!hasUrls && !data.id) {
      return jsonOk({
        status: "failed",
        error: "Генерация завершена, но видео не создано (возможно, контент был отфильтрован). Попробуйте другой промпт.",
      });
    }

    const storageUrl = await downloadAndStoreVideo(generationId, apiKey, user.id, hasUrls ? data.unsigned_urls : undefined);
    if (!storageUrl) return jsonError("Не удалось сохранить видео. Попробуйте ещё раз.", 500);

    const supabaseAdmin = getSupabaseAdmin();
    await supabaseAdmin
      .from("pending_generations")
      .update({ status: "completed", result_url: storageUrl })
      .eq("generation_id", generationId);

    return jsonOk({ status: "completed", url: storageUrl });
  }

  if (
    data.status === "failed" ||
    data.status === "error" ||
    data.status === "expired" ||
    data.status === "cancelled"
  ) {
    const rawErr = data.error;
    console.error("[generate-video] generation failed:", JSON.stringify(rawErr ?? data.status));
    let errMsg = "Генерация видео завершилась с ошибкой. Попробуйте ещё раз.";
    if (rawErr && typeof rawErr !== "string") {
      const code = (rawErr.code || "").split(".")[0];
      if (KNOWN_ERROR_CODES[code]) errMsg = KNOWN_ERROR_CODES[code];
      else if (rawErr.message && rawErr.message.length < 300) {
        errMsg = `${errMsg} (${rawErr.message})`;
      }
    }
    const rawErrText = typeof rawErr === "string" ? rawErr : JSON.stringify(rawErr ?? "");
    if (/filtered|sensitive/i.test(rawErrText)) {
      errMsg = KNOWN_ERROR_CODES.ContentFiltered;
    } else if (typeof rawErr === "string" && rawErr.length < 300) {
      errMsg = `${errMsg} (${rawErr})`;
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: pg } = await supabaseAdmin
      .from("pending_generations")
      .select("estimated_cost, status")
      .eq("generation_id", generationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (pg && pg.status === "pending" && pg.estimated_cost > 0) {
      const { data: sr } = await supabaseAdmin.from("app_settings").select("free_mode").eq("id", 1).maybeSingle();
      if (sr?.free_mode !== true) {
        await supabaseAdmin.rpc("add_tokens", { p_user_id: user.id, p_amount: pg.estimated_cost });
      }
    }
    await supabaseAdmin
      .from("pending_generations")
      .update({ status: "failed", error_message: errMsg.slice(0, 500) })
      .eq("generation_id", generationId);

    return jsonOk({ status: "failed", error: errMsg });
  }

  return jsonOk({ status: data.status || "pending" });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method === "GET") {
      return await handlePoll(req);
    }
    return await handleSubmit(req);
  } catch (err) {
    console.error("generate-video error:", err);
    return new Response(
      JSON.stringify({ error: "Внутренняя ошибка сервера" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
