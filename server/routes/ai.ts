import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { getUserId } from '../lib/auth.js';
import { isFreeMode, getApiKey, getBalance, deductTokens, addTokens } from '../lib/billing.js';
import { mkdirSync, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import path from 'node:path';

// ---- Chat pricing (₽ per 1M tokens) ----
const CHAT_PRICES: Record<string, { input: number; output: number }> = {
  "gpt-5": { input: 25, output: 2000 }, "gpt-5-mini": { input: 5, output: 400 },
  "gpt-4.1": { input: 100, output: 1600 }, "gpt-4.1-mini": { input: 20, output: 320 }, "gpt-4.1-nano": { input: 5, output: 80 },
  "gpt-4o": { input: 250, output: 2000 }, "gpt-4o-mini": { input: 15, output: 120 },
  "o3": { input: 100, output: 1600 }, "o3-mini": { input: 110, output: 880 }, "o4-mini": { input: 55, output: 880 },
  "claude-opus-5": { input: 100, output: 5000 }, "claude-sonnet-5": { input: 40, output: 2000 },
  "claude-sonnet-4": { input: 60, output: 3000 }, "claude-haiku-4.5": { input: 20, output: 1000 },
  "gemini-2.5-pro": { input: 25, output: 2000 }, "gemini-2.5-flash": { input: 6, output: 500 },
  "gemini-3.7-flash": { input: 7.5, output: 375 }, "gemini-3.5-flash": { input: 30, output: 1800 },
  "deepseek-v4-pro-0813": { input: 4.4, output: 396 }, "deepseek-v4-flash-vision-exp": { input: 1.4, output: 132 },
  "deepseek-r1": { input: 70, output: 430 }, "deepseek-chat": { input: 4.18, output: 61.92 },
  "llama-4-maverick": { input: 40, output: 139.2 }, "llama-4-scout": { input: 20, output: 60 },
  "llama-3.3-70b-instruct": { input: 20, output: 64 },
  "mistral-large-2512": { input: 10, output: 300 }, "mistral-medium-3-5": { input: 300, output: 1500 },
  "mistral-small-2603": { input: 3, output: 120 }, "codestral-2508": { input: 6, output: 180 },
  "qwen3.8-flash": { input: 1.2, output: 26 }, "qwen3.8-27b": { input: 8, output: 600 }, "qwen3.8-2.4t-a95b": { input: 40, output: 1200 },
  "glm-5.3-flash": { input: 15, output: 50 }, "glm-5.3": { input: 52.08, output: 880 },
  "grok-4.6": { input: 100, output: 1200 }, "grok-4.5": { input: 60, output: 1200 }, "grok-4.3": { input: 21, output: 63 },
  "seed-2-1-turbo": { input: 100, output: 500 }, "muse-spark-1.2-contributor": { input: 0.4, output: 40 },
};
const DEFAULT_CHAT_PRICE = { input: 100, output: 1600 };

// ---- Image pricing (₽ per image base) ----
const IMAGE_MODELS: Record<string, { unit: number; maxN: number }> = {
  "gpt-image-2": { unit: 1.53, maxN: 10 }, "gpt-image-1": { unit: 2.04, maxN: 10 }, "gpt-image-1-mini": { unit: 0.41, maxN: 10 },
  "muse-image": { unit: 1.7, maxN: 1 }, "gemini-3.1-flash-image": { unit: 5.1, maxN: 1 },
  "gemini-3.1-flash-lite-image": { unit: 2.89, maxN: 1 }, "gemini-3-pro-image": { unit: 11.9, maxN: 1 },
  "gemini-2.5-flash-image": { unit: 5.95, maxN: 1 }, "seedream-5-0-lite": { unit: 5.95, maxN: 4 },
  "seedream-5-0-pro": { unit: 7.65, maxN: 1 }, "seedream-4.5": { unit: 6.8, maxN: 10 },
  "flux.2-klein-4b": { unit: 2.55, maxN: 1 }, "flux.2-pro": { unit: 5.44, maxN: 1 },
  "flux.2-max": { unit: 12.58, maxN: 1 }, "flux.2-flex": { unit: 10.71, maxN: 1 },
  "grok-imagine-image-2.0": { unit: 6.8, maxN: 1 }, "grok-imagine-image-quality": { unit: 8.5, maxN: 1 },
  "recraft-v4.1": { unit: 5.95, maxN: 6 }, "recraft-v4.1-pro": { unit: 35.7, maxN: 6 },
  "recraft-v4.1-utility": { unit: 5.95, maxN: 6 }, "recraft-v4.1-utility-pro": { unit: 35.7, maxN: 6 },
  "riverflow-v2.5-fast": { unit: 3.23, maxN: 1 }, "riverflow-v2.5-pro": { unit: 22.1, maxN: 1 },
  "krea-2-medium": { unit: 5.1, maxN: 1 }, "krea-2-large": { unit: 10.2, maxN: 1 },
  "qwen-image-3-pro": { unit: 6.8, maxN: 6 }, "qwen-image-3": { unit: 5.1, maxN: 6 },
};
const WORST_CASE_MULTIPLIER = 4;

// ---- Video pricing (₽ per second) ----
const VIDEO_PRICES: Record<string, number> = {
  "veo-3.1": 102, "veo-3.1-fast": 51, "veo-3.1-lite": 13.6,
  "kling-v3.0-pro": 28.56, "kling-v3.0-std": 28.56, "kling-v3.0-turbo": 14.28, "kling-video-o1": 19.04,
  "sora-2-pro": 85, "wan-3.0": 28.9, "wan-2.7": 17, "wan-2.6": 25.5,
  "seedance-2.5": 39.54, "seedance-2.0": 75.91, "seedance-2.0-fast": 26.99, "seedance-2.0-mini": 6.75, "seedance-1-5-pro": 26.03,
  "hailuo-3": 22.1, "hailuo-2.3": 13.89, "gen-4.5": 20.4, "aleph-2": 47.6,
  "grok-imagine-video-1.5": 42.5, "grok-imagine-video": 11.9, "flux-3-video": 90.1,
  "avatar-iv": 8.5, "happyhorse-1.1": 21.73, "happyhorse-1.0": 28.8,
};

// ---- TTS pricing (₽ per 1M characters) ----
const TTS_PRICES: Record<string, number> = {
  "gpt-4o-mini-tts": 3000, "tts-1": 3000, "tts-1-hd": 6000,
  "grok-voice-tts-1.0": 3000, "gemini-3.1-flash-tts-preview": 6000,
  "voxtral-mini-tts-2603": 3200, "qwen-audio-3.0-tts-flash": 3000, "qwen-audio-3.0-tts-plus": 4000,
  "speech-2.8-turbo": 12000, "speech-2.8-hd": 20000, "aura-2": 6000,
  "orpheus-3b-0.1-ft": 1400, "kokoro-82m": 124,
};

// ---- STT pricing (₽ per second) ----
const STT_PRICES: Record<string, number> = {
  "whisper-large-v3-turbo": 0.003, "whisper-large-v3": 0.003,
  "gpt-4o-mini-transcribe": 0.017, "gpt-4o-transcribe": 0.017,
};

export default function registerAiRoutes(app: FastifyInstance, pool: Pool, storageDir: string) {

  // ---- CHAT ----
  app.post<{ Body: Record<string, unknown> }>('/api/ai/chat', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    const { messages, model = 'gpt-4.1', max_tokens = 4096, temperature, top_p, frequency_penalty, presence_penalty } = request.body as any;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 200) {
      return reply.code(400).send({ error: 'Некорректный список сообщений' });
    }
    const apiKey = await getApiKey(pool);
    if (!apiKey) return reply.code(503).send({ error: 'AI-сервис временно недоступен' });

    const usedMaxTokens = Math.min(16384, Math.max(1, Math.round(max_tokens)));
    const prices = CHAT_PRICES[model] || DEFAULT_CHAT_PRICE;
    let promptChars = 0;
    try { promptChars = JSON.stringify(messages).length; } catch {}
    const estimatedPromptTokens = Math.ceil(promptChars / 3);
    const minBalance = Math.max(0.5, (usedMaxTokens / 1_000_000) * prices.output + (estimatedPromptTokens / 1_000_000) * prices.input);

    const freeMode = await isFreeMode(pool);
    if (!freeMode) {
      const balance = await getBalance(pool, userId);
      if (balance < minBalance) {
        return reply.code(402).send({ error: `Недостаточно средств: нужно не менее ${minBalance.toFixed(2)} ₽` });
      }
    }

    const payload: Record<string, unknown> = { model, messages, max_tokens: usedMaxTokens, temperature: typeof temperature === 'number' ? Math.min(2, Math.max(0, temperature)) : 0.7 };
    if (typeof top_p === 'number') payload.top_p = Math.min(1, Math.max(0, top_p));
    if (typeof frequency_penalty === 'number') payload.frequency_penalty = Math.min(2, Math.max(-2, frequency_penalty));
    if (typeof presence_penalty === 'number') payload.presence_penalty = Math.min(2, Math.max(-2, presence_penalty));

    let upstream: Response;
    try {
      upstream = await fetch('https://api.aitunnel.ru/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
    } catch (err) {
      request.log.error(err, 'Chat upstream fetch failed');
      return reply.code(502).send({ error: 'AI-сервис временно недоступен. Попробуйте позже.' });
    }
    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '');
      const filtered = /filtered|sensitive|safety|moderation/i.test(errText);
      return reply.code(upstream.status).send({ error: filtered ? 'Запрос отклонён системой безопасности.' : 'Не удалось получить ответ. Попробуйте другую модель.' });
    }
    let result: any;
    try {
      result = await upstream.json();
    } catch {
      return reply.code(502).send({ error: 'Некорректный ответ от AI-сервиса.' });
    }

    const promptTokens = result.usage?.prompt_tokens ?? 0;
    const completionTokens = result.usage?.completion_tokens ?? 0;
    const costRubles = (promptTokens / 1_000_000) * prices.input + (completionTokens / 1_000_000) * prices.output;

    if (!freeMode) {
      const newBalance = await deductTokens(pool, userId, costRubles);
      if (newBalance === null) return reply.code(402).send({ error: 'Не удалось списать средства' });
      result.tokens_remaining = newBalance;
    }
    result.cost_rubles = Math.round(costRubles * 10000) / 10000;
    return result;
  });

  // ---- IMAGE ----
  app.post<{ Body: Record<string, unknown> }>('/api/ai/image', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    const apiKey = await getApiKey(pool);
    if (!apiKey) return reply.code(503).send({ error: 'AI-сервис временно недоступен' });
    const { prompt, model = 'gpt-image-1', n, resolution, aspect_ratio, quality, size, input_references } = request.body as any;
    if (typeof prompt !== 'string' || !prompt.trim()) return reply.code(400).send({ error: 'Необходимо описание изображения' });

    const modelLimits = IMAGE_MODELS[model];
    const usedN = Math.min(modelLimits?.maxN ?? 1, 10, Math.max(1, Math.floor(Number(n) || 1)));
    const worstCaseCost = (modelLimits?.unit ?? 12) * WORST_CASE_MULTIPLIER * usedN;

    const freeMode = await isFreeMode(pool);
    if (!freeMode) {
      const balance = await getBalance(pool, userId);
      if (balance < Math.max(2, worstCaseCost)) {
        return reply.code(402).send({ error: `Недостаточно средств: нужно не менее ${worstCaseCost.toFixed(2)} ₽` });
      }
    }

    const payload: Record<string, unknown> = { model, prompt };
    if (usedN > 1) payload.n = usedN;
    if (resolution) payload.resolution = resolution;
    if (aspect_ratio) payload.aspect_ratio = aspect_ratio;
    if (quality) payload.quality = quality;
    if (size) payload.size = size;
    if (input_references?.length) payload.input_references = input_references;

    let upstream: Response;
    try {
      upstream = await fetch('https://api.aitunnel.ru/v1/images/generations', {
        method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
    } catch (err) {
      request.log.error(err, 'Image upstream fetch failed');
      return reply.code(502).send({ error: 'AI-сервис временно недоступен. Попробуйте позже.' });
    }
    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '');
      const filtered = /filtered|sensitive|safety|moderation/i.test(errText);
      return reply.code(upstream.status).send({ error: filtered ? 'Запрос отклонён системой безопасности.' : 'Не удалось сгенерировать изображение.' });
    }
    let result: any;
    try {
      result = await upstream.json();
    } catch {
      return reply.code(502).send({ error: 'Некорректный ответ от AI-сервиса.' });
    }
    const costRubles = result.usage?.cost_rub ?? 5;

    // Save b64 images to disk
    if (result.data && Array.isArray(result.data)) {
      for (const item of result.data) {
        if (item.b64_json) {
          const ext = (item.media_type || 'image/png').includes('webp') ? 'webp' : 'png';
          const fileName = `${crypto.randomUUID()}.${ext}`;
          const userDir = path.join(storageDir, 'generated-images', userId);
          mkdirSync(userDir, { recursive: true });
          const filePath = path.join(userDir, fileName);
          const buf = Buffer.from(item.b64_json, 'base64');
          const rs = Readable.from(buf);
          await pipeline(rs, createWriteStream(filePath));
          item.storage_url = `/storage/generated-images/${userId}/${fileName}`;
        }
      }
    }

    if (!freeMode) {
      const newBalance = await deductTokens(pool, userId, costRubles);
      if (newBalance === null) return reply.code(402).send({ error: 'Не удалось списать средства' });
      result.tokens_remaining = newBalance;
    }
    result.cost_rubles = costRubles;
    return result;
  });

  // ---- VIDEO SUBMIT ----
  app.post<{ Body: Record<string, unknown> }>('/api/ai/video', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    const apiKey = await getApiKey(pool);
    if (!apiKey) return reply.code(503).send({ error: 'AI-сервис временно недоступен' });
    const { prompt, model = 'wan-3.0', duration = 5, aspect_ratio, resolution, size, negative_prompt,
      first_frame_url, last_frame_url, reference_url, audio_url, reference_urls, video_reference_urls, audio_reference_urls } = request.body as any;

    const hasMedia = !!(first_frame_url || last_frame_url || reference_url || audio_url || reference_urls?.length || video_reference_urls?.length || audio_reference_urls?.length);
    if ((!prompt || !prompt.trim()) && !hasMedia) return reply.code(400).send({ error: 'Необходимо описание видео или медиа' });
    if (prompt && prompt.length > 10000) return reply.code(400).send({ error: 'Описание слишком длинное' });

    const usedDuration = Math.min(Math.max(1, duration || 5), 30);
    const pricePerSec = VIDEO_PRICES[model] || 14;
    const estimatedCost = pricePerSec * usedDuration;

    const freeMode = await isFreeMode(pool);
    if (!freeMode) {
      const newBalance = await deductTokens(pool, userId, estimatedCost);
      if (newBalance === null) {
        return reply.code(402).send({ error: `Недостаточно средств. Нужно ~${estimatedCost.toFixed(0)} ₽.` });
      }
    }

    const isAvatar = model === 'avatar-iv';
    const trimmedPrompt = (prompt || '').trim();
    const payload: Record<string, unknown> = { model, prompt: trimmedPrompt || '' };

    if (isAvatar) {
      if (resolution) payload.resolution = resolution;
      const refs: Array<Record<string, unknown>> = [];
      const imgUrl = reference_url || first_frame_url;
      if (imgUrl) refs.push({ type: 'image_url', image_url: { url: imgUrl } });
      if (audio_url) refs.push({ type: 'audio_url', audio_url: { url: audio_url } });
      if (refs.length > 0) payload.input_references = refs;
    } else {
      if (usedDuration) payload.duration = usedDuration;
      if (aspect_ratio) payload.aspect_ratio = aspect_ratio;
      if (size && /^\d+x\d+$/.test(size)) { payload.size = size; }
      else if (resolution === '2K' || resolution === '4K') {
        const sizeMap: Record<string, Record<string, string>> = {
          '2K': { '21:9': '3360x1440', '16:9': '2560x1440', '4:3': '1920x1440', '1:1': '1440x1440', '3:4': '1440x1920', '9:16': '1440x2560' },
          '4K': { '16:9': '3840x2160', '9:16': '2160x3840' },
        };
        const ar = aspect_ratio || '16:9';
        const pixelSize = sizeMap[resolution]?.[ar] || sizeMap[resolution]?.['16:9'];
        if (pixelSize) payload.size = pixelSize; else payload.resolution = resolution;
      } else if (resolution) { payload.resolution = resolution; }
      if (negative_prompt?.trim()) payload.negative_prompt = negative_prompt.trim();

      const frameImages: Array<Record<string, unknown>> = [];
      if (first_frame_url) frameImages.push({ type: 'image_url', image_url: { url: first_frame_url }, frame_type: 'first_frame' });
      if (last_frame_url) frameImages.push({ type: 'image_url', image_url: { url: last_frame_url }, frame_type: 'last_frame' });
      if (frameImages.length > 0) payload.frame_images = frameImages;

      const inputRefs: Array<Record<string, unknown>> = [];
      if (reference_url) inputRefs.push({ type: 'image_url', image_url: { url: reference_url } });
      for (const u of (reference_urls || [])) if (u) inputRefs.push({ type: 'image_url', image_url: { url: u } });
      for (const u of (video_reference_urls || [])) if (u) inputRefs.push({ type: 'video_url', video_url: { url: u } });
      if (audio_url) inputRefs.push({ type: 'audio_url', audio_url: { url: audio_url } });
      for (const u of (audio_reference_urls || [])) if (u) inputRefs.push({ type: 'audio_url', audio_url: { url: u } });
      if (inputRefs.length > 0) payload.input_references = inputRefs;
    }

    let submitRes: Response;
    try {
      submitRes = await fetch('https://api.aitunnel.ru/v1/videos', {
        method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
    } catch (err) {
      request.log.error(err, 'Video upstream fetch failed');
      if (!freeMode) await addTokens(pool, userId, estimatedCost);
      return reply.code(502).send({ error: 'AI-сервис временно недоступен. Попробуйте позже.' });
    }

    if (!submitRes.ok) {
      const errText = await submitRes.text().catch(() => '');
      if (!freeMode) await addTokens(pool, userId, estimatedCost);
      return reply.code(submitRes.status).send({ error: extractVideoError(errText) });
    }
    let submitData: any;
    try {
      submitData = await submitRes.json();
    } catch {
      if (!freeMode) await addTokens(pool, userId, estimatedCost);
      return reply.code(502).send({ error: 'Некорректный ответ от AI-сервиса.' });
    }
    if (!submitData.id) {
      if (!freeMode) await addTokens(pool, userId, estimatedCost);
      return reply.code(500).send({ error: 'Не удалось запустить генерацию видео' });
    }

    await pool.query(
      `INSERT INTO pending_generations (generation_id, user_id, type, prompt, model, duration, aspect_ratio, estimated_cost, status)
       VALUES ($1, $2, 'video', $3, $4, $5, $6, $7, 'pending')
       ON CONFLICT (generation_id) DO UPDATE SET status = 'pending'`,
      [submitData.id, userId, trimmedPrompt.slice(0, 500) || '(media only)', model, usedDuration, aspect_ratio || null, estimatedCost],
    );

    if (submitData.status === 'completed') {
      const storageUrl = await downloadAndStoreVideo(submitData.id, apiKey, userId, storageDir, submitData.unsigned_urls);
      if (storageUrl) {
        await pool.query('UPDATE pending_generations SET status = $1, result_url = $2 WHERE generation_id = $3', ['completed', storageUrl, submitData.id]);
        return { status: 'completed', generation_id: submitData.id, url: storageUrl, cost: freeMode ? 0 : estimatedCost, charged: true };
      }
    }
    return { status: submitData.status || 'pending', generation_id: submitData.id, estimated_cost: estimatedCost, charged: true };
  });

  // ---- VIDEO POLL ----
  app.get<{ Querystring: { id?: string } }>('/api/ai/video', async (request, reply) => {
    const userId = getUserId(request);
    const generationId = request.query.id;
    if (!userId || !generationId) return reply.code(401).send({ error: 'Необходима авторизация' });

    const owned = await pool.query('SELECT id FROM pending_generations WHERE generation_id = $1 AND user_id = $2', [generationId, userId]);
    if (!owned.rows[0]) return reply.code(404).send({ error: 'Задание не найдено' });

    const apiKey = await getApiKey(pool);
    if (!apiKey) return reply.code(503).send({ error: 'AI-сервис временно недоступен' });

    let res: Response;
    try {
      res = await fetch(`https://api.aitunnel.ru/v1/videos/${encodeURIComponent(generationId)}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    } catch {
      return { status: 'pending', detail: 'AI-сервис временно недоступен.' };
    }
    if (!res.ok) {
      if (res.status >= 500) return { status: 'pending', detail: 'Сервер генерации временно недоступен.' };
      return { status: 'failed', error: 'Не удалось проверить статус генерации.' };
    }
    const data = await res.json() as any;

    if (data.status === 'completed') {
      const hasUrls = Array.isArray(data.unsigned_urls) && data.unsigned_urls.length > 0;
      if (!hasUrls && !data.id) return { status: 'failed', error: 'Видео не создано (контент отфильтрован).' };
      const storageUrl = await downloadAndStoreVideo(generationId, apiKey, userId, storageDir, hasUrls ? data.unsigned_urls : undefined);
      if (!storageUrl) return reply.code(500).send({ error: 'Не удалось сохранить видео.' });
      await pool.query('UPDATE pending_generations SET status = $1, result_url = $2 WHERE generation_id = $3', ['completed', storageUrl, generationId]);
      return { status: 'completed', url: storageUrl };
    }

    if (['failed', 'error', 'expired', 'cancelled'].includes(data.status)) {
      const errMsg = 'Генерация видео завершилась с ошибкой.';
      const { rows: [pg] } = await pool.query('SELECT estimated_cost, status FROM pending_generations WHERE generation_id = $1 AND user_id = $2', [generationId, userId]);
      if (pg?.status === 'pending' && pg.estimated_cost > 0) {
        const freeMode = await isFreeMode(pool);
        if (!freeMode) await addTokens(pool, userId, Number(pg.estimated_cost));
      }
      await pool.query('UPDATE pending_generations SET status = $1, error_message = $2 WHERE generation_id = $3', ['failed', errMsg, generationId]);
      return { status: 'failed', error: errMsg };
    }

    return { status: data.status || 'pending' };
  });

  // ---- TTS ----
  app.post<{ Body: Record<string, unknown> }>('/api/ai/tts', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    const apiKey = await getApiKey(pool);
    if (!apiKey) return reply.code(503).send({ error: 'AI-сервис временно недоступен' });
    const { text, model = 'gpt-4o-mini-tts', voice = 'alloy', instructions, ref_audio, ref_audio_mime, ref_text } = request.body as any;
    if (typeof text !== 'string' || !text.trim()) return reply.code(400).send({ error: 'Необходим текст для озвучки' });
    if (text.length > 4096) return reply.code(400).send({ error: 'Текст слишком длинный (макс 4096 символов)' });

    const pricePerMil = TTS_PRICES[model] || 3000;
    const minBalance = Math.max(0.1, (4096 / 1_000_000) * pricePerMil);

    const freeMode = await isFreeMode(pool);
    if (!freeMode) {
      const balance = await getBalance(pool, userId);
      if (balance < minBalance) return reply.code(402).send({ error: 'Недостаточно средств' });
    }

    const pcmModels = ['gemini-3.1-flash-tts-preview'];
    const usedFormat = pcmModels.includes(model) ? 'pcm' : 'mp3';
    const payload: Record<string, unknown> = { model, input: text, response_format: usedFormat, voice };

    if (model === 'voxtral-mini-tts-2603') {
      if (!ref_audio) return reply.code(400).send({ error: 'Для этой модели нужен образец голоса' });
      let audioBase64 = ref_audio;
      let audioMime = ref_audio_mime || 'audio/wav';
      if (ref_audio.startsWith('http')) {
        const audioResp = await fetch(ref_audio);
        if (!audioResp.ok) return reply.code(400).send({ error: 'Не удалось загрузить образец голоса' });
        audioMime = audioResp.headers.get('content-type') || audioMime;
        audioBase64 = Buffer.from(await audioResp.arrayBuffer()).toString('base64');
      }
      payload.ref_audio = `data:${audioMime};base64,${audioBase64}`;
      if (ref_text?.trim()) payload.ref_text = ref_text.trim();
    }
    if (instructions && model === 'gpt-4o-mini-tts') payload.instructions = instructions;

    let upstream: Response;
    try {
      upstream = await fetch('https://api.aitunnel.ru/v1/audio/speech', {
        method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
    } catch (err) {
      request.log.error(err, 'TTS upstream fetch failed');
      return reply.code(502).send({ error: 'AI-сервис временно недоступен. Попробуйте позже.' });
    }
    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '');
      const filtered = /filtered|sensitive|safety|moderation/i.test(errText);
      return reply.code(upstream.status).send({ error: filtered ? 'Текст отклонён системой безопасности.' : 'Не удалось озвучить текст.' });
    }
    const audio = Buffer.from(await upstream.arrayBuffer());
    const costRubles = (text.length / 1_000_000) * pricePerMil;

    let finalBalance = 999999;
    if (!freeMode) {
      const nb = await deductTokens(pool, userId, costRubles);
      if (nb === null) return reply.code(402).send({ error: 'Не удалось списать средства' });
      finalBalance = nb;
    }
    reply.header('Content-Type', usedFormat === 'pcm' ? 'audio/L16;rate=24000' : 'audio/mpeg');
    reply.header('X-Cost-Rubles', String(Math.round(costRubles * 10000) / 10000));
    reply.header('X-Balance-Remaining', String(Math.round(finalBalance * 100) / 100));
    reply.header('Access-Control-Expose-Headers', 'X-Cost-Rubles, X-Balance-Remaining');
    return reply.send(audio);
  });

  // ---- STT ----
  app.post<{ Body: { audio_data?: string; model?: string; language?: string } }>('/api/ai/stt', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    const apiKey = await getApiKey(pool);
    if (!apiKey) return reply.code(503).send({ error: 'AI-сервис временно недоступен' });
    const { audio_data, model = 'whisper-large-v3-turbo', language } = request.body;
    if (typeof audio_data !== 'string' || audio_data.length > 25_000_000) return reply.code(400).send({ error: 'Некорректное аудио' });

    const pricePerSec = STT_PRICES[model] || 0.003;
    const estimatedSecs = (audio_data.length * 0.75) / 16000;
    const minBalance = Math.max(0.01, pricePerSec * estimatedSecs);

    const freeMode = await isFreeMode(pool);
    if (!freeMode) {
      const balance = await getBalance(pool, userId);
      if (balance < minBalance) return reply.code(402).send({ error: 'Недостаточно средств' });
    }

    const raw = audio_data.includes(',') ? audio_data.split(',')[1] : audio_data;
    const mime = audio_data.match(/^data:([^;]+);/)?.[1] || 'audio/webm';
    const form = new FormData();
    form.append('file', new Blob([Buffer.from(raw, 'base64')], { type: mime }), `audio.${mime.includes('wav') ? 'wav' : 'webm'}`);
    form.append('model', model);
    if (language) form.append('language', language);

    let upstream: Response;
    try {
      upstream = await fetch('https://api.aitunnel.ru/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form });
    } catch (err) {
      request.log.error(err, 'STT upstream fetch failed');
      return reply.code(502).send({ error: 'AI-сервис временно недоступен. Попробуйте позже.' });
    }
    const result = await upstream.json().catch(() => ({})) as any;
    if (!upstream.ok) return reply.code(upstream.status).send({ error: 'Не удалось распознать речь' });

    const actualDuration = result.duration || 0;
    const costRubles = pricePerSec * actualDuration;

    let finalBalance = 999999;
    if (!freeMode) {
      const nb = await deductTokens(pool, userId, costRubles);
      if (nb === null) return reply.code(402).send({ error: 'Не удалось списать средства' });
      finalBalance = nb;
    }
    reply.header('X-Cost-Rubles', String(Math.round(costRubles * 10000) / 10000));
    reply.header('X-Balance-Remaining', String(Math.round(finalBalance * 100) / 100));
    reply.header('Access-Control-Expose-Headers', 'X-Cost-Rubles, X-Balance-Remaining');
    return { text: result.text || '', duration: actualDuration };
  });
}

function extractVideoError(raw: string): string {
  const generic = 'Не удалось запустить генерацию видео. Попробуйте изменить описание или модель.';
  if (/prompt.{0,20}(too long|length|exceed|limit|max)/i.test(raw)) return 'Описание слишком длинное для этой модели.';
  if (/filtered|sensitive|unsafe|moderation|violat/i.test(raw)) return 'Контент отфильтрован системой безопасности.';
  if (/rate.?limit/i.test(raw)) return 'Слишком много запросов. Подождите.';
  try {
    const parsed = JSON.parse(raw);
    const detail = typeof parsed?.error === 'string' ? parsed.error : parsed?.error?.message;
    if (detail && detail.length < 300) return `${generic} (${detail})`;
  } catch {}
  return generic;
}

async function downloadAndStoreVideo(generationId: string, apiKey: string, userId: string, storageDir: string, unsignedUrls?: string[]): Promise<string | null> {
  const sources: Array<{ url: string; needsAuth: boolean }> = [];
  if (unsignedUrls?.length) for (const u of unsignedUrls) sources.push({ url: u, needsAuth: false });
  sources.push({ url: `https://api.aitunnel.ru/v1/videos/${encodeURIComponent(generationId)}/content?index=0`, needsAuth: true });

  for (const src of sources) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const headers: Record<string, string> = {};
        if (src.needsAuth) headers.Authorization = `Bearer ${apiKey}`;
        const res = await fetch(src.url, { headers });
        if (!res.ok) { if (res.status >= 500 && attempt < 2) { await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); continue; } break; }
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.byteLength === 0) { if (attempt < 2) { await new Promise(r => setTimeout(r, 2000)); continue; } break; }
        const ct = res.headers.get('content-type') || '';
        const ext = ct.includes('webm') ? 'webm' : 'mp4';
        const userDir = path.join(storageDir, 'generated-videos', userId);
        mkdirSync(userDir, { recursive: true });
        const fileName = `${generationId}.${ext}`;
        const filePath = path.join(userDir, fileName);
        const rs = Readable.from(buf);
        await pipeline(rs, createWriteStream(filePath));
        return `/storage/generated-videos/${userId}/${fileName}`;
      } catch (e) {
        if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
  }
  return null;
}
