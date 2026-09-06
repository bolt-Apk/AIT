import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { getUserId } from '../lib/auth.js';

export default function registerSharedMediaRoutes(app: FastifyInstance, pool: Pool) {

  // Lookup nickname → user_id
  app.get<{ Querystring: { q?: string } }>('/api/nicknames/search', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    const q = (request.query.q || '').trim().toLowerCase();
    if (q.length < 2) return [];
    const escaped = q.replace(/[%_\\]/g, '\\$&');
    const { rows } = await pool.query(
      "SELECT user_id, nickname FROM user_balances WHERE nickname IS NOT NULL AND lower(nickname) LIKE $1 ESCAPE '\\' AND user_id != $2 LIMIT 10",
      [`%${escaped}%`, userId],
    );
    return rows;
  });

  // Send media to user
  app.post<{ Body: { receiver_nickname?: string; media_type?: string; media_url?: string; prompt?: string; model?: string } }>('/api/shared-media/send', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    const { receiver_nickname, media_type = 'image', media_url, prompt, model } = request.body;
    if (!receiver_nickname || !media_url) return reply.code(400).send({ error: 'Missing params' });

    const { rows: [receiver] } = await pool.query('SELECT user_id FROM user_balances WHERE lower(nickname) = lower($1)', [receiver_nickname]);
    if (!receiver) return reply.code(404).send({ error: 'Пользователь не найден' });
    if (receiver.user_id === userId) return reply.code(400).send({ error: 'Нельзя отправить самому себе' });

    await pool.query(
      'INSERT INTO shared_media (sender_id, receiver_id, media_type, media_url, prompt, model) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, receiver.user_id, media_type, media_url, prompt || null, model || null],
    );
    return { success: true };
  });

  // Get received media
  app.get('/api/shared-media/received', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    const { rows } = await pool.query(
      `SELECT sm.*, b.nickname as sender_nickname
       FROM shared_media sm
       LEFT JOIN user_balances b ON b.user_id = sm.sender_id
       WHERE sm.receiver_id = $1
       ORDER BY sm.created_at DESC LIMIT 100`,
      [userId],
    );
    return rows;
  });

  // Get sent media
  app.get('/api/shared-media/sent', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    const { rows } = await pool.query(
      'SELECT * FROM shared_media WHERE sender_id = $1 ORDER BY created_at DESC LIMIT 100',
      [userId],
    );
    return rows;
  });

  // Mark as seen
  app.put<{ Params: { id: string } }>('/api/shared-media/:id/seen', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    await pool.query('UPDATE shared_media SET seen = true WHERE id = $1 AND receiver_id = $2', [request.params.id, userId]);
    return { ok: true };
  });

  // Delete
  app.delete<{ Params: { id: string } }>('/api/shared-media/:id', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    await pool.query('DELETE FROM shared_media WHERE id = $1 AND (sender_id = $2 OR receiver_id = $2)', [request.params.id, userId]);
    return reply.code(204).send();
  });

  // Unseen count
  app.get('/api/shared-media/unseen-count', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    const { rows } = await pool.query('SELECT count(*) FROM shared_media WHERE receiver_id = $1 AND seen = false', [userId]);
    return { count: Number(rows[0].count) };
  });

  // Support polling endpoint for new messages
  app.get<{ Querystring: { ticket_id?: string; after?: string } }>('/api/support/poll', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    const { ticket_id, after } = request.query;
    if (!ticket_id) return reply.code(400).send({ error: 'Missing ticket_id' });

    const owned = await pool.query('SELECT id FROM support_tickets WHERE id = $1 AND user_id = $2', [ticket_id, userId]);
    if (!owned.rows[0]) return reply.code(404).send({ error: 'Ticket not found' });

    if (after) {
      const { rows } = await pool.query('SELECT * FROM support_messages WHERE ticket_id = $1 AND created_at > $2 ORDER BY created_at ASC', [ticket_id, after]);
      return { messages: rows };
    }
    return { messages: [] };
  });

  // Balance + referral info
  app.get('/api/balance/full', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    const { rows: [row] } = await pool.query(
      'SELECT tokens, referral_code, referred_by, total_referral_earnings, banned_at, ban_reason, nickname FROM user_balances WHERE user_id = $1',
      [userId],
    );
    if (!row) return reply.code(404).send({ error: 'Balance not found' });
    return { ...row, tokens: Number(row.tokens), total_referral_earnings: Number(row.total_referral_earnings) };
  });

  // Pending generations
  app.get('/api/pending-generations', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    const { rows } = await pool.query("SELECT * FROM pending_generations WHERE user_id = $1 AND status = 'pending' ORDER BY created_at DESC", [userId]);
    return rows;
  });

  // App settings (public read for free_mode)
  app.get('/api/app-settings', async (_request, reply) => {
    const { rows: [settings] } = await pool.query('SELECT free_mode FROM app_settings WHERE id = 1');
    return { free_mode: settings?.free_mode || false };
  });

  // User stats (public, for Auth page)
  app.get('/api/user-stats', async () => {
    const twoMinAgo = new Date(Date.now() - 120000).toISOString();
    const { rows: [r] } = await pool.query(`
      SELECT (SELECT count(*) FROM user_balances) AS total_users,
             (SELECT count(*) FROM user_presence WHERE last_seen >= $1) AS online_users
    `, [twoMinAgo]);
    return { total_users: Number(r.total_users), online_users: Number(r.online_users) };
  });

  // Support unread count (for user)
  app.get('/api/support/unread', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    const { rows } = await pool.query("SELECT COALESCE(SUM(unread_user), 0) as total FROM support_tickets WHERE user_id = $1", [userId]);
    return { unread: Number(rows[0].total) };
  });

  // Update pending generation
  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>('/api/pending-generations/:id', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    const { status, result_url, error_message } = request.body as any;
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    if (status) { sets.push(`status = ${idx++}`); vals.push(status); }
    if (result_url) { sets.push(`result_url = ${idx++}`); vals.push(result_url); }
    if (error_message) { sets.push(`error_message = ${idx++}`); vals.push(error_message); }
    if (!sets.length) return reply.code(400).send({ error: 'No fields' });
    vals.push(request.params.id, userId);
    await pool.query(`UPDATE pending_generations SET ${sets.join(', ')} WHERE generation_id = ${idx++} AND user_id = ${idx}`, vals);
    return { ok: true };
  });

  // Bulk update stale pending generations
  app.post('/api/pending-generations/cleanup-stale', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    const { before } = request.body as any;
    if (!before) return reply.code(400).send({ error: 'Missing before' });
    await pool.query("UPDATE pending_generations SET status = 'failed', error_message = 'Expired' WHERE user_id = $1 AND status = 'pending' AND created_at < $2", [userId, before]);
    return { ok: true };
  });

  // Mark all shared media as seen
  app.post('/api/shared-media/mark-all-seen', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    await pool.query('UPDATE shared_media SET seen = true WHERE receiver_id = $1 AND seen = false', [userId]);
    return { ok: true };
  });

  // Create pending generation (from frontend)
  app.post<{ Body: Record<string, unknown> }>('/api/pending-generations', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    const { generation_id, prompt, model, duration, aspect_ratio, estimated_cost } = request.body as any;
    if (!generation_id) return reply.code(400).send({ error: 'Missing generation_id' });
    await pool.query(
      `INSERT INTO pending_generations (generation_id, user_id, type, prompt, model, duration, aspect_ratio, estimated_cost, status)
       VALUES ($1, $2, 'video', $3, $4, $5, $6, $7, 'pending') ON CONFLICT (generation_id) DO NOTHING`,
      [generation_id, userId, (prompt || '').slice(0, 500), model || '', duration || 5, aspect_ratio || null, estimated_cost || 0],
    );
    return { ok: true };
  });
}
