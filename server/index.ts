import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { issueToken, getUserId } from './lib/auth.js';
import registerAiRoutes from './routes/ai.js';
import registerAdminRoutes from './routes/admin.js';
import registerPaymentRoutes from './routes/payments.js';
import registerSharedMediaRoutes from './routes/shared-media.js';
import registerStorageRoutes from './routes/storage.js';

const port = Number(process.env.PORT ?? 3000);
if (!process.env.JWT_SECRET) console.warn('JWT_SECRET is not set; using a development fallback.');

const sslEnabled = process.env.POSTGRESQL_SSL === 'true';
const sslRootCert = process.env.PGSSLROOTCERT;

function buildSslConfig() {
  if (!sslEnabled) return undefined;
  if (sslRootCert) return { rejectUnauthorized: true, ca: readFileSync(sslRootCert, 'utf8') };
  return { rejectUnauthorized: false };
}

const pool = new Pool({
  host: process.env.POSTGRESQL_HOST,
  port: Number(process.env.POSTGRESQL_PORT ?? 5432),
  user: process.env.POSTGRESQL_USER,
  password: process.env.POSTGRESQL_PASSWORD,
  database: process.env.POSTGRESQL_DBNAME,
  ssl: buildSslConfig(),
  max: 10,
});

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(currentDir, '../server/schema.sql');
try {
  await pool.query(readFileSync(schemaPath, 'utf8'));
} catch (err) {
  console.error('Schema init failed (will retry on first request):', (err as Error).message);
}

const app = Fastify({ logger: true });
await app.register(cors, { origin: process.env.CORS_ORIGIN ?? true, credentials: true });
await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024, files: 1 } });

let storageDir = path.resolve(process.env.STORAGE_DIR ?? path.resolve(currentDir, '../storage'));
try {
  mkdirSync(storageDir, { recursive: true });
} catch {
  storageDir = '/tmp/app-storage';
  console.warn(`Cannot create original storage dir, falling back to ${storageDir}`);
  mkdirSync(storageDir, { recursive: true });
}
await app.register(fastifyStatic, { root: storageDir, prefix: '/storage/', decorateReply: false });

// ---- Health ----
app.get('/health', async () => ({ ok: true }));
app.get('/api/health', async () => { await pool.query('SELECT 1'); return { ok: true }; });

// ---- Auth ----
app.post<{ Body: { email?: string; password?: string } }>('/api/auth/register', async (request, reply) => {
  const email = request.body.email?.trim().toLowerCase();
  const password = request.body.password;
  if (!email || !password || password.length < 8) return reply.code(400).send({ error: 'Некорректный email или пароль' });
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const result = await pool.query('INSERT INTO app_users (email, password_hash) VALUES ($1, $2) RETURNING id, email, display_name', [email, passwordHash]);
    const user = result.rows[0];
    await pool.query('INSERT INTO user_balances (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);
    return reply.code(201).send({ user, access_token: issueToken(user.id) });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') return reply.code(409).send({ error: 'Не удалось создать аккаунт с этими данными' });
    throw error;
  }
});

app.post<{ Body: { email?: string; password?: string } }>('/api/auth/login', async (request, reply) => {
  const email = request.body.email?.trim().toLowerCase();
  const password = request.body.password ?? '';
  const result = await pool.query('SELECT id, email, password_hash FROM app_users WHERE email = $1 AND is_active = true', [email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) return reply.code(401).send({ error: 'Неверный email или пароль.' });
  // Check ban
  const { rows: [bal] } = await pool.query('SELECT banned_at, ban_reason FROM user_balances WHERE user_id = $1', [user.id]);
  if (bal?.banned_at) return reply.code(403).send({ error: `Аккаунт заблокирован: ${bal.ban_reason || 'нарушение правил'}` });
  return { user: { id: user.id, email: user.email }, access_token: issueToken(user.id) };
});

app.get('/api/auth/me', async (request, reply) => {
  const userId = getUserId(request);
  if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
  const result = await pool.query('SELECT id, email, display_name FROM app_users WHERE id = $1 AND is_active = true', [userId]);
  const user = result.rows[0];
  if (!user) return reply.code(401).send({ error: 'Необходима авторизация' });
  return { user };
});

// ---- Profile ----
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
  if (typeof password !== 'string' || password.length < 8) return reply.code(400).send({ error: 'Пароль должен содержать минимум 8 символов' });
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query('UPDATE app_users SET password_hash = $1, updated_at = now() WHERE id = $2', [passwordHash, userId]);
  return { ok: true };
});

// ---- Presence ----
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

// ---- Balance ----
app.get('/api/balance', async (request, reply) => {
  const userId = getUserId(request);
  if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
  const result = await pool.query('INSERT INTO user_balances (user_id) VALUES ($1) ON CONFLICT (user_id) DO UPDATE SET updated_at = user_balances.updated_at RETURNING tokens', [userId]);
  return { tokens: Number(result.rows[0].tokens) };
});

// ---- Support chat ----
app.get('/api/support/ticket', async (request, reply) => {
  const userId = getUserId(request);
  if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
  const existing = await pool.query("SELECT * FROM support_tickets WHERE user_id = $1 AND status = 'open' ORDER BY created_at DESC LIMIT 1", [userId]);
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
  const owned = await pool.query("SELECT id FROM support_tickets WHERE id = $1 AND user_id = $2 AND status = 'open'", [request.params.ticketId, userId]);
  if (!owned.rows[0]) return reply.code(404).send({ error: 'Диалог не найден' });
  const mediaType = ['text', 'image', 'video', 'audio'].includes(request.body.media_type || '') ? request.body.media_type : 'text';
  const result = await pool.query('INSERT INTO support_messages (ticket_id, sender, content, media_url, media_type) VALUES ($1, $2, $3, $4, $5) RETURNING *', [request.params.ticketId, 'user', request.body.content ?? null, request.body.media_url ?? null, mediaType]);
  await pool.query('UPDATE support_tickets SET last_message_at = now(), unread_admin = unread_admin + 1 WHERE id = $1', [request.params.ticketId]);
  return result.rows[0];
});

// ---- History CRUD ----
const historyTables = { chat: 'chat_sessions', tts: 'tts_history', video: 'video_history', image: 'image_history' } as const;
type HistoryType = keyof typeof historyTables;
function historyType(value: string): HistoryType | null { return value in historyTables ? value as HistoryType : null; }

app.get<{ Params: { type: string } }>('/api/history/:type', async (request, reply) => {
  const userId = getUserId(request);
  const type = historyType(request.params.type);
  if (!userId || !type) return reply.code(401).send({ error: 'Необходима авторизация' });
  const result = await pool.query(`SELECT * FROM ${historyTables[type]} WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`, [userId]);
  return result.rows;
});

app.post<{ Params: { type: string }; Body: Record<string, unknown> }>('/api/history/:type', async (request, reply) => {
  const userId = getUserId(request);
  const type = historyType(request.params.type);
  if (!userId || !type) return reply.code(401).send({ error: 'Необходима авторизация' });
  const allowed = type === 'chat' ? ['title', 'model', 'messages'] : type === 'tts' ? ['text', 'model', 'voice', 'audio_url'] : type === 'video' ? ['prompt', 'model', 'duration', 'video_url'] : ['prompt', 'model', 'image_url'];
  const fields = allowed.filter((f) => request.body[f] !== undefined);
  if (!fields.length) return reply.code(400).send({ error: 'Нет данных' });
  const values = fields.map((f) => request.body[f]);
  const result = await pool.query(`INSERT INTO ${historyTables[type]} (user_id, ${fields.join(', ')}) VALUES ($1, ${fields.map((_, i) => `$${i + 2}`).join(', ')}) RETURNING *`, [userId, ...values]);
  return reply.code(201).send(result.rows[0]);
});

app.put<{ Params: { type: string; id: string }; Body: Record<string, unknown> }>('/api/history/:type/:id', async (request, reply) => {
  const userId = getUserId(request);
  const type = historyType(request.params.type);
  if (!userId || !type) return reply.code(401).send({ error: 'Необходима авторизация' });
  if (type !== 'chat') return reply.code(405).send({ error: 'Операция не поддерживается' });
  const fields = ['title', 'model', 'messages'].filter((f) => request.body[f] !== undefined);
  if (!fields.length) return reply.code(400).send({ error: 'Нет данных' });
  const values = fields.map((f) => request.body[f]);
  const result = await pool.query(`UPDATE chat_sessions SET ${fields.map((f, i) => `${f} = $${i + 1}`).join(', ')}, updated_at = now() WHERE id = $${fields.length + 1} AND user_id = $${fields.length + 2} RETURNING *`, [...values, request.params.id, userId]);
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

// ---- Register route modules ----
registerAiRoutes(app, pool, storageDir);
registerAdminRoutes(app, pool);
registerPaymentRoutes(app, pool);
registerSharedMediaRoutes(app, pool);
registerStorageRoutes(app, pool, storageDir);

// ---- Static / SPA fallback ----
const publicDir = path.resolve(currentDir, '../dist');
await app.register(fastifyStatic, { root: publicDir, prefix: '/' });
app.setNotFoundHandler(async (request, reply) => {
  if (request.method === 'GET' && !request.url.startsWith('/api/')) return reply.sendFile('index.html');
  return reply.code(404).send({ error: 'Not found' });
});

await app.listen({ host: '0.0.0.0', port });
