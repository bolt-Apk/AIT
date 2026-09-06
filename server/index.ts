import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { createWriteStream, mkdirSync, readFileSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT ?? 3000);
const jwtSecret = process.env.JWT_SECRET ?? 'dev-jwt-secret-change-me';
if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is not set; using a development fallback secret. Set JWT_SECRET in production.');
}

const sslEnabled = process.env.POSTGRESQL_SSL === 'true';
const sslRootCert = process.env.PGSSLROOTCERT;
if (sslEnabled && !sslRootCert) throw new Error('PGSSLROOTCERT is required when POSTGRESQL_SSL=true');

const pool = new Pool({
  host: process.env.POSTGRESQL_HOST,
  port: Number(process.env.POSTGRESQL_PORT ?? 5432),
  user: process.env.POSTGRESQL_USER,
  password: process.env.POSTGRESQL_PASSWORD,
  database: process.env.POSTGRESQL_DBNAME,
  ssl: sslEnabled
    ? { rejectUnauthorized: true, ca: readFileSync(sslRootCert!, 'utf8') }
    : undefined,
  max: 10,
});

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(currentDir, '../server/schema.sql');
await pool.query(readFileSync(schemaPath, 'utf8'));

const app = Fastify({ logger: true });
await app.register(cors, { origin: process.env.CORS_ORIGIN ?? true, credentials: true });
await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024, files: 1 } });

const storageDir = path.resolve(process.env.STORAGE_DIR ?? path.resolve(currentDir, '../storage'));
mkdirSync(storageDir, { recursive: true });
await app.register(fastifyStatic, { root: storageDir, prefix: '/storage/', decorateReply: false });

function issueToken(userId: string) {
  return jwt.sign({ sub: userId }, jwtSecret, { expiresIn: '7d' });
}

function getUserId(request: { headers: Record<string, string | string[] | undefined> }) {
  const header = request.headers.authorization;
  const authorization = Array.isArray(header) ? header[0] : header;
  if (!authorization?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(authorization.slice(7), jwtSecret) as jwt.JwtPayload;
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

app.get('/api/health', async () => {
  await pool.query('SELECT 1');
  return { ok: true, database: 'connected' };
});

app.post<{ Body: { email?: string; password?: string } }>('/api/auth/register', async (request, reply) => {
  const email = request.body.email?.trim().toLowerCase();
  const password = request.body.password;
  if (!email || !password || password.length < 8) {
    return reply.code(400).send({ error: 'Некорректный email или пароль' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const result = await pool.query(
      'INSERT INTO app_users (email, password_hash) VALUES ($1, $2) RETURNING id, email, display_name',
      [email, passwordHash],
    );
    const user = result.rows[0];
    await pool.query('INSERT INTO user_balances (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);
    return reply.code(201).send({ user, token: issueToken(user.id) });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return reply.code(409).send({ error: 'Не удалось создать аккаунт с этими данными' });
    }
    throw error;
  }
});

app.post<{ Body: { email?: string; password?: string } }>('/api/auth/login', async (request, reply) => {
  const email = request.body.email?.trim().toLowerCase();
  const password = request.body.password ?? '';
  const result = await pool.query(
    'SELECT id, email, password_hash FROM app_users WHERE email = $1 AND is_active = true',
    [email],
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return reply.code(401).send({ error: 'Неверный email или пароль.' });
  }
  return { user: { id: user.id, email: user.email }, token: issueToken(user.id) };
});

app.get('/api/auth/me', async (request, reply) => {
  const userId = getUserId(request);
  if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
  const result = await pool.query('SELECT id, email, display_name FROM app_users WHERE id = $1 AND is_active = true', [userId]);
  const user = result.rows[0];
  if (!user) return reply.code(401).send({ error: 'Необходима авторизация' });
  return { user };
});

app.put<{ Body: { display_name?: string; nickname?: string } }>('/api/profile', async (request, reply) => {
  const userId = getUserId(request);
  if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
  const displayName = typeof request.body.display_name === 'string' ? request.body.display_name.trim().slice(0, 80) : undefined;
  const nickname = typeof request.body.nickname === 'string' ? request.body.nickname.trim().toLowerCase() : undefined;
  if (nickname !== undefined && !/^[a-z0-9_.-]{3,24}$/.test(nickname)) return reply.code(400).send({ error: 'Некорректный никнейм' });
  try {
    if (displayName !== undefined) await pool.query('UPDATE app_users SET display_name = $1, updated_at = now() WHERE id = $2', [displayName || null, userId]);
    if (nickname !== undefined) await pool.query('UPDATE user_balances SET nickname = $1, updated_at = now() WHERE user_id = $2', [nickname, userId]);
    const result = await pool.query('SELECT u.id, u.email, u.display_name, b.nickname FROM app_users u LEFT JOIN user_balances b ON b.user_id = u.id WHERE u.id = $1', [userId]);
    return { user: result.rows[0] };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') return reply.code(409).send({ error: 'Этот никнейм уже занят' });
    throw error;
  }
});

app.put<{ Body: { password?: string } }>('/api/profile/password', async (request, reply) => {
  const userId = getUserId(request);
  const password = request.body.password;
  if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
  if (typeof password !== 'string' || password.length < 6) return reply.code(400).send({ error: 'Пароль должен содержать минимум 6 символов' });
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query('UPDATE app_users SET password_hash = $1, updated_at = now() WHERE id = $2', [passwordHash, userId]);
  return { ok: true };
});

app.put<{ Body: { device_type?: string; user_agent?: string } }>('/api/presence', async (request, reply) => {
  const userId = getUserId(request);
  if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
  const deviceType = request.body.device_type === 'mobile' ? 'mobile' : 'desktop';
  await pool.query(
    'INSERT INTO user_presence (user_id, last_seen, device_type, user_agent) VALUES ($1, now(), $2, $3) ON CONFLICT (user_id) DO UPDATE SET last_seen = now(), device_type = EXCLUDED.device_type, user_agent = EXCLUDED.user_agent',
    [userId, deviceType, String(request.body.user_agent ?? '').slice(0, 255)],
  );
  return { ok: true };
});

app.get('/api/support/ticket', async (request, reply) => {
  const userId = getUserId(request);
  if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
  const existing = await pool.query('SELECT * FROM support_tickets WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1', [userId, 'open']);
  if (existing.rows[0]) return existing.rows[0];
  const created = await pool.query('INSERT INTO support_tickets (user_id) VALUES ($1) RETURNING *', [userId]);
  return created.rows[0];
});

app.get<{ Params: { ticketId: string } }>('/api/support/tickets/:ticketId/messages', async (request, reply) => {
  const userId = getUserId(request);
  if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
  const owned = await pool.query('SELECT id FROM support_tickets WHERE id = $1 AND user_id = $2', [request.params.ticketId, userId]);
  if (!owned.rows[0]) return reply.code(404).send({ error: 'Диалог не найден' });
  await pool.query('UPDATE support_tickets SET unread_user = 0 WHERE id = $1', [request.params.ticketId]);
  const messages = await pool.query('SELECT * FROM support_messages WHERE ticket_id = $1 ORDER BY created_at ASC', [request.params.ticketId]);
  return messages.rows;
});

app.post<{ Params: { ticketId: string }; Body: { content?: string | null; media_url?: string | null; media_type?: string } }>('/api/support/tickets/:ticketId/messages', async (request, reply) => {
  const userId = getUserId(request);
  if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
  const owned = await pool.query('SELECT id FROM support_tickets WHERE id = $1 AND user_id = $2 AND status = $3', [request.params.ticketId, userId, 'open']);
  if (!owned.rows[0]) return reply.code(404).send({ error: 'Диалог не найден' });
  const mediaType = ['text', 'image', 'video', 'audio'].includes(request.body.media_type || '') ? request.body.media_type : 'text';
  const result = await pool.query('INSERT INTO support_messages (ticket_id, sender, content, media_url, media_type) VALUES ($1, $2, $3, $4, $5) RETURNING *', [request.params.ticketId, 'user', request.body.content ?? null, request.body.media_url ?? null, mediaType]);
  await pool.query('UPDATE support_tickets SET last_message_at = now(), unread_admin = unread_admin + 1 WHERE id = $1', [request.params.ticketId]);
  return result.rows[0];
});

app.get('/api/balance', async (request, reply) => {
  const userId = getUserId(request);
  if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
  const result = await pool.query(
    'INSERT INTO user_balances (user_id) VALUES ($1) ON CONFLICT (user_id) DO UPDATE SET updated_at = user_balances.updated_at RETURNING tokens',
    [userId],
  );
  return { tokens: Number(result.rows[0].tokens) };
});

app.post<{ Body: { amount?: number } }>('/api/balance/deduct', async (request, reply) => {
  const userId = getUserId(request);
  const amount = Number(request.body.amount);
  if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
  if (!Number.isFinite(amount) || amount <= 0) return reply.code(400).send({ error: 'Некорректная сумма' });
  const result = await pool.query(
    'UPDATE user_balances SET tokens = tokens - $1, updated_at = now() WHERE user_id = $2 AND tokens >= $1 RETURNING tokens',
    [amount, userId],
  );
  if (!result.rows[0]) return reply.code(402).send({ error: 'Недостаточно токенов' });
  return { tokens: Number(result.rows[0].tokens) };
});

app.post<{ Body: { messages?: unknown[]; model?: string; temperature?: number; max_tokens?: number; top_p?: number; frequency_penalty?: number; presence_penalty?: number } }>('/api/ai/chat', async (request, reply) => {
  const userId = getUserId(request);
  if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
  const { messages, model = 'gpt-4.1', max_tokens = 4096 } = request.body;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 200) {
    return reply.code(400).send({ error: 'Некорректный список сообщений' });
  }
  const apiKey = process.env.AITUNNEL_API_KEY;
  if (!apiKey) return reply.code(503).send({ error: 'AI-сервис временно недоступен' });
  const usedMaxTokens = Math.min(16384, Math.max(1, Math.round(max_tokens)));
  const estimatedCost = Math.max(0.5, (usedMaxTokens / 1_000_000) * 1600);
  const balance = await pool.query(
    'SELECT tokens FROM user_balances WHERE user_id = $1 AND tokens >= $2',
    [userId, estimatedCost],
  );
  if (!balance.rows[0]) return reply.code(402).send({ error: 'Недостаточно средств для запроса' });

  const upstream = await fetch('https://api.aitunnel.ru/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request.body, model, max_tokens: usedMaxTokens }),
  });
  const result = await upstream.json().catch(() => ({}));
  if (!upstream.ok) return reply.code(upstream.status).send({ error: 'Не удалось получить ответ AI' });

  const completionTokens = Number(result.usage?.completion_tokens ?? usedMaxTokens);
  const actualCost = Math.max(0.5, (completionTokens / 1_000_000) * 1600);
  const updated = await pool.query(
    'UPDATE user_balances SET tokens = tokens - $1, updated_at = now() WHERE user_id = $2 AND tokens >= $1 RETURNING tokens',
    [actualCost, userId],
  );
  if (!updated.rows[0]) return reply.code(402).send({ error: 'Не удалось списать средства' });
  reply.header('X-Balance-Remaining', String(updated.rows[0].tokens));
  return { ...result, cost_rubles: actualCost, tokens_remaining: Number(updated.rows[0].tokens) };
});

app.post<{ Body: Record<string, unknown> }>('/api/ai/image', async (request, reply) => {
  const userId = getUserId(request);
  if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
  const apiKey = process.env.AITUNNEL_API_KEY;
  if (!apiKey) return reply.code(503).send({ error: 'AI-сервис временно недоступен' });
  const prompt = request.body.prompt;
  if (typeof prompt !== 'string' || !prompt.trim()) return reply.code(400).send({ error: 'Необходимо описание изображения' });
  const input = JSON.stringify(request.body);
  if (input.length > 25_000_000) return reply.code(413).send({ error: 'Запрос слишком большой' });
  const balance = await pool.query('SELECT tokens FROM user_balances WHERE user_id = $1 AND tokens >= 5', [userId]);
  if (!balance.rows[0]) return reply.code(402).send({ error: 'Недостаточно средств для генерации' });
  const upstream = await fetch('https://api.aitunnel.ru/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: input,
  });
  const result = await upstream.json().catch(() => ({}));
  if (!upstream.ok) return reply.code(upstream.status).send({ error: 'Не удалось сгенерировать изображение' });
  const updated = await pool.query(
    'UPDATE user_balances SET tokens = tokens - 5, updated_at = now() WHERE user_id = $1 AND tokens >= 5 RETURNING tokens',
    [userId],
  );
  if (!updated.rows[0]) return reply.code(402).send({ error: 'Не удалось списать средства' });
  reply.header('X-Balance-Remaining', String(updated.rows[0].tokens));
  return { ...result, cost_rubles: 5, tokens_remaining: Number(updated.rows[0].tokens) };
});

app.post<{ Body: Record<string, unknown> }>('/api/ai/video', async (request, reply) => {
  const userId = getUserId(request);
  if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
  const apiKey = process.env.AITUNNEL_API_KEY;
  if (!apiKey) return reply.code(503).send({ error: 'AI-сервис временно недоступен' });
  const balance = await pool.query('SELECT tokens FROM user_balances WHERE user_id = $1 AND tokens >= 20', [userId]);
  if (!balance.rows[0]) return reply.code(402).send({ error: 'Недостаточно средств для генерации видео' });
  const upstream = await fetch('https://api.aitunnel.ru/v1/videos', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(request.body),
  });
  const result = await upstream.json().catch(() => ({}));
  if (!upstream.ok || typeof result.id !== 'string') return reply.code(upstream.status || 502).send({ error: 'Не удалось запустить генерацию видео' });
  await pool.query(
    'INSERT INTO pending_generations (generation_id, user_id, prompt, model, duration) VALUES ($1, $2, $3, $4, $5)',
    [result.id, userId, String(request.body.prompt ?? ''), String(request.body.model ?? ''), Number(request.body.duration ?? 5)],
  );
  const updated = await pool.query('UPDATE user_balances SET tokens = tokens - 20, updated_at = now() WHERE user_id = $1 AND tokens >= 20 RETURNING tokens', [userId]);
  if (!updated.rows[0]) return reply.code(402).send({ error: 'Не удалось списать средства' });
  return { status: result.status || 'pending', generation_id: result.id, estimated_cost: 20, charged: true };
});

app.get<{ Querystring: { id?: string } }>('/api/ai/video', async (request, reply) => {
  const userId = getUserId(request);
  const generationId = request.query.id;
  if (!userId || !generationId) return reply.code(401).send({ error: 'Необходима авторизация' });
  const owned = await pool.query('SELECT id FROM pending_generations WHERE generation_id = $1 AND user_id = $2', [generationId, userId]);
  if (!owned.rows[0]) return reply.code(404).send({ error: 'Задание не найдено' });
  const apiKey = process.env.AITUNNEL_API_KEY;
  if (!apiKey) return reply.code(503).send({ error: 'AI-сервис временно недоступен' });
  const upstream = await fetch(`https://api.aitunnel.ru/v1/videos/${encodeURIComponent(generationId)}`, { headers: { Authorization: `Bearer ${apiKey}` } });
  const result = await upstream.json().catch(() => ({}));
  if (!upstream.ok) return reply.code(upstream.status).send({ error: 'Не удалось проверить видео' });
  const url = result.unsigned_urls?.[0] || result.url;
  if (result.status === 'completed' && url) {
    await pool.query('UPDATE pending_generations SET status = $1, result_url = $2 WHERE generation_id = $3 AND user_id = $4', ['completed', url, generationId, userId]);
    return { status: 'completed', url };
  }
  if (result.status === 'failed') return { status: 'failed', error: 'Генерация видео завершилась с ошибкой' };
  return { status: result.status || 'pending' };
});

app.post<{ Body: Record<string, unknown> }>('/api/ai/tts', async (request, reply) => {
  const userId = getUserId(request);
  const apiKey = process.env.AITUNNEL_API_KEY;
  const text = request.body.text;
  if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
  if (!apiKey) return reply.code(503).send({ error: 'AI-сервис временно недоступен' });
  if (typeof text !== 'string' || !text.trim()) return reply.code(400).send({ error: 'Необходим текст' });
  const balance = await pool.query('SELECT tokens FROM user_balances WHERE user_id = $1 AND tokens >= 1', [userId]);
  if (!balance.rows[0]) return reply.code(402).send({ error: 'Недостаточно средств' });
  const upstream = await fetch('https://api.aitunnel.ru/v1/audio/speech', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(request.body),
  });
  if (!upstream.ok) return reply.code(upstream.status).send({ error: 'Не удалось озвучить текст' });
  const audio = Buffer.from(await upstream.arrayBuffer());
  const updated = await pool.query('UPDATE user_balances SET tokens = tokens - 1, updated_at = now() WHERE user_id = $1 AND tokens >= 1 RETURNING tokens', [userId]);
  if (!updated.rows[0]) return reply.code(402).send({ error: 'Не удалось списать средства' });
  reply.header('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
  reply.header('X-Balance-Remaining', String(updated.rows[0].tokens));
  return reply.send(audio);
});

app.post<{ Body: { audio_data?: string; model?: string; language?: string } }>('/api/ai/stt', async (request, reply) => {
  const userId = getUserId(request);
  const apiKey = process.env.AITUNNEL_API_KEY;
  const audioData = request.body.audio_data;
  if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
  if (!apiKey) return reply.code(503).send({ error: 'AI-сервис временно недоступен' });
  if (typeof audioData !== 'string' || audioData.length > 25_000_000) return reply.code(400).send({ error: 'Некорректное аудио' });
  const raw = audioData.includes(',') ? audioData.split(',')[1] : audioData;
  const mime = audioData.match(/^data:([^;]+);/)?.[1] || 'audio/webm';
  const form = new FormData();
  form.append('file', new Blob([Buffer.from(raw, 'base64')], { type: mime }), `audio.${mime.includes('wav') ? 'wav' : 'webm'}`);
  form.append('model', request.body.model || 'whisper-large-v3-turbo');
  if (request.body.language) form.append('language', request.body.language);
  const upstream = await fetch('https://api.aitunnel.ru/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form });
  const result = await upstream.json().catch(() => ({}));
  if (!upstream.ok) return reply.code(upstream.status).send({ error: 'Не удалось распознать речь' });
  const updated = await pool.query('UPDATE user_balances SET tokens = tokens - 1, updated_at = now() WHERE user_id = $1 AND tokens >= 1 RETURNING tokens', [userId]);
  if (!updated.rows[0]) return reply.code(402).send({ error: 'Не удалось списать средства' });
  reply.header('X-Balance-Remaining', String(updated.rows[0].tokens));
  return { text: result.text || '', duration: result.duration || 0 };
});

const historyTables = {
  chat: 'chat_sessions',
  tts: 'tts_history',
  video: 'video_history',
  image: 'image_history',
} as const;

type HistoryType = keyof typeof historyTables;
function historyType(value: string): HistoryType | null {
  return value in historyTables ? value as HistoryType : null;
}

app.get<{ Params: { type: string } }>('/api/history/:type', async (request, reply) => {
  const userId = getUserId(request);
  const type = historyType(request.params.type);
  if (!userId || !type) return reply.code(401).send({ error: 'Необходима авторизация' });
  const table = historyTables[type];
  const result = await pool.query(`SELECT * FROM ${table} WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`, [userId]);
  return result.rows;
});

app.post<{ Params: { type: string }; Body: Record<string, unknown> }>('/api/history/:type', async (request, reply) => {
  const userId = getUserId(request);
  const type = historyType(request.params.type);
  if (!userId || !type) return reply.code(401).send({ error: 'Необходима авторизация' });
  const table = historyTables[type];
  const allowed = type === 'chat'
    ? ['title', 'model', 'messages']
    : type === 'tts'
      ? ['text', 'model', 'voice', 'audio_url']
      : type === 'video'
        ? ['prompt', 'model', 'duration', 'video_url']
        : ['prompt', 'model', 'image_url'];
  const fields = allowed.filter((field) => request.body[field] !== undefined);
  if (!fields.length) return reply.code(400).send({ error: 'Нет данных' });
  const values = fields.map((field) => request.body[field]);
  const result = await pool.query(
    `INSERT INTO ${table} (user_id, ${fields.join(', ')}) VALUES ($1, ${fields.map((_, index) => `$${index + 2}`).join(', ')}) RETURNING *`,
    [userId, ...values],
  );
  return reply.code(201).send(result.rows[0]);
});

app.put<{ Params: { type: string; id: string }; Body: Record<string, unknown> }>('/api/history/:type/:id', async (request, reply) => {
  const userId = getUserId(request);
  const type = historyType(request.params.type);
  if (!userId || !type) return reply.code(401).send({ error: 'Необходима авторизация' });
  if (type !== 'chat') return reply.code(405).send({ error: 'Операция не поддерживается' });
  const fields = ['title', 'model', 'messages'].filter((field) => request.body[field] !== undefined);
  if (!fields.length) return reply.code(400).send({ error: 'Нет данных' });
  const values = fields.map((field) => request.body[field]);
  const result = await pool.query(
    `UPDATE chat_sessions SET ${fields.map((field, index) => `${field} = $${index + 1}`).join(', ')}, updated_at = now() WHERE id = $${fields.length + 1} AND user_id = $${fields.length + 2} RETURNING *`,
    [...values, request.params.id, userId],
  );
  if (!result.rows[0]) return reply.code(404).send({ error: 'Запись не найдена' });
  return result.rows[0];
});

app.delete<{ Params: { type: string; id: string } }>('/api/history/:type/:id', async (request, reply) => {
  const userId = getUserId(request);
  const type = historyType(request.params.type);
  if (!userId || !type) return reply.code(401).send({ error: 'Необходима авторизация' });
  const result = await pool.query(`DELETE FROM ${historyTables[type]} WHERE id = $1 AND user_id = $2`, [request.params.id, userId]);
  if (!result.rowCount) return reply.code(404).send({ error: 'Запись не найдена' });
  return reply.code(204).send();
});

app.post('/api/storage/tts-audio', async (request, reply) => {
  const userId = getUserId(request);
  if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
  const file = await request.file();
  if (!file || file.mimetype !== 'audio/mpeg') return reply.code(400).send({ error: 'Ожидается MP3-файл' });
  const userDir = path.join(storageDir, 'tts-audio', userId);
  mkdirSync(userDir, { recursive: true });
  const fileName = `${crypto.randomUUID()}.mp3`;
  await pipeline(file.file, createWriteStream(path.join(userDir, fileName)));
  return { url: `/storage/tts-audio/${userId}/${fileName}` };
});

const publicDir = path.resolve(currentDir, '../dist');
await app.register(fastifyStatic, { root: publicDir, prefix: '/' });
app.setNotFoundHandler(async (request, reply) => {
  if (request.method === 'GET' && !request.url.startsWith('/api/')) {
    return reply.sendFile('index.html');
  }
  return reply.code(404).send({ error: 'Not found' });
});

await app.listen({ host: '0.0.0.0', port });
