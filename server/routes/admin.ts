import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { requireAdmin } from '../lib/auth.js';
import { addTokens } from '../lib/billing.js';

export default function registerAdminRoutes(app: FastifyInstance, pool: Pool) {

  app.post<{ Body: Record<string, unknown> }>('/api/admin', async (request, reply) => {
    const adminId = await requireAdmin(pool, request, reply);
    if (!adminId) return;

    const action = (request.body.action || (request.query as any)?.action) as string;
    if (!action) return reply.code(400).send({ error: 'Missing action' });

    if (action === 'stats') return getStats(pool);
    if (action === 'users') return getUsers(pool);
    if (action === 'presence') return getPresence(pool);

    if (action === 'update_balance') {
      const { userId, amount } = request.body as any;
      if (!userId || typeof amount !== 'number' || amount < 0 || amount > 1000000) return reply.code(400).send({ error: 'Invalid params' });
      const { rows } = await pool.query('UPDATE user_balances SET tokens = $1, updated_at = now() WHERE user_id = $2 RETURNING tokens', [amount, userId]);
      if (!rows[0]) return reply.code(404).send({ error: 'User not found' });
      return { success: true, tokens: Number(rows[0].tokens) };
    }

    if (action === 'top_up_user_balance') {
      const { user_id, amount } = request.body as any;
      if (!user_id || typeof amount !== 'number' || amount <= 0) return reply.code(400).send({ error: 'Invalid params' });
      const newBalance = await addTokens(pool, user_id, amount);
      return { success: true, tokens: newBalance };
    }

    if (action === 'delete_user') {
      const { userId } = request.body as any;
      if (!userId) return reply.code(400).send({ error: 'Missing userId' });
      await pool.query('UPDATE app_users SET is_active = false WHERE id = $1', [userId]);
      return { success: true };
    }

    if (action === 'ban_user') {
      const { userId, reason } = request.body as any;
      if (!userId) return reply.code(400).send({ error: 'Missing userId' });
      await pool.query('UPDATE user_balances SET banned_at = now(), ban_reason = $1 WHERE user_id = $2', [reason || 'Нарушение правил', userId]);
      return { success: true };
    }

    if (action === 'unban_user') {
      const { userId } = request.body as any;
      if (!userId) return reply.code(400).send({ error: 'Missing userId' });
      await pool.query('UPDATE user_balances SET banned_at = NULL, ban_reason = NULL WHERE user_id = $1', [userId]);
      return { success: true };
    }

    if (action === 'user_generations') {
      const userId = (request.body as any).userId || (request.query as any)?.userId;
      if (!userId) return reply.code(400).send({ error: 'Missing userId' });
      return getUserGenerations(pool, userId);
    }

    // Support chat actions
    if (action === 'get_support_tickets') {
      const { rows: tickets } = await pool.query(
        `SELECT t.*, u.email as user_email FROM support_tickets t JOIN app_users u ON u.id = t.user_id ORDER BY t.last_message_at DESC`
      );
      return { tickets };
    }

    if (action === 'get_support_messages') {
      const ticketId = (request.body as any).ticket_id;
      if (!ticketId) return reply.code(400).send({ error: 'Missing ticket_id' });
      const { rows: messages } = await pool.query('SELECT * FROM support_messages WHERE ticket_id = $1 ORDER BY created_at ASC', [ticketId]);
      return { messages };
    }

    if (action === 'send_support_message') {
      const { ticket_id, content, media_url, media_type = 'text' } = request.body as any;
      if (!ticket_id) return reply.code(400).send({ error: 'Missing ticket_id' });
      await pool.query('INSERT INTO support_messages (ticket_id, sender, content, media_url, media_type) VALUES ($1, $2, $3, $4, $5)', [ticket_id, 'admin', content, media_url, media_type]);
      await pool.query('UPDATE support_tickets SET last_message_at = now(), unread_user = unread_user + 1 WHERE id = $1', [ticket_id]);
      return { success: true };
    }

    if (action === 'mark_ticket_read') {
      const ticketId = (request.body as any).ticket_id;
      if (!ticketId) return reply.code(400).send({ error: 'Missing ticket_id' });
      await pool.query('UPDATE support_tickets SET unread_admin = 0 WHERE id = $1', [ticketId]);
      return { success: true };
    }

    if (action === 'get_support_unread') {
      const { rows } = await pool.query('SELECT COALESCE(SUM(unread_admin), 0) as total FROM support_tickets');
      return { unread: Number(rows[0].total) };
    }

    if (action === 'delete_support_ticket') {
      const ticketId = (request.body as any).ticket_id;
      if (!ticketId) return reply.code(400).send({ error: 'Missing ticket_id' });
      await pool.query('DELETE FROM support_messages WHERE ticket_id = $1', [ticketId]);
      await pool.query('DELETE FROM support_tickets WHERE id = $1', [ticketId]);
      return { success: true };
    }

    if (action === 'set_free_mode') {
      const { enabled } = request.body as any;
      await pool.query('UPDATE app_settings SET free_mode = $1, updated_at = now() WHERE id = 1', [!!enabled]);
      return { success: true, free_mode: !!enabled };
    }

    if (action === 'model_health_check') {
      const apiKey = process.env.AITUNNEL_API_KEY;
      if (!apiKey) return { models: [], error: 'No API key' };
      try {
        const res = await fetch('https://api.aitunnel.ru/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) return { models: [], error: `HTTP ${res.status}` };
        const data = await res.json() as any;
        return { models: data.data || data.models || [] };
      } catch (e) {
        return { models: [], error: String(e) };
      }
    }

    if (action === 'check_admin') {
      return { is_admin: true };
    }

    return reply.code(400).send({ error: 'Unknown action' });
  });

  // Also support GET for stats/users/presence/check
  app.get('/api/admin', async (request, reply) => {
    const action = (request.query as any)?.action;

    // check_admin needs special handling - don't return 403 on non-admin
    if (action === 'check_admin') {
      const userId = getUserId(request);
      if (!userId) return { is_admin: false };
      const { rows } = await pool.query('SELECT id FROM admin_users WHERE id = $1', [userId]);
      return { is_admin: !!rows[0] };
    }

    const adminId = await requireAdmin(pool, request, reply);
    if (!adminId) return;
    if (action === 'stats') return getStats(pool);
    if (action === 'users') return getUsers(pool);
    if (action === 'presence') return getPresence(pool);
    if (action === 'user_generations') {
      const userId = (request.query as any)?.userId;
      if (!userId) return reply.code(400).send({ error: 'Missing userId' });
      return getUserGenerations(pool, userId);
    }
    return reply.code(400).send({ error: 'Unknown action' });
  });
}

async function getStats(pool: Pool) {
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const yesterday = new Date(Date.now() - 86400000);
  yesterday.setHours(0, 0, 0, 0);
  const ydayStart = yesterday.toISOString();

  const counts = await pool.query(`
    SELECT
      (SELECT count(*) FROM user_balances) AS total_users,
      (SELECT count(*) FROM image_history) AS total_images,
      (SELECT count(*) FROM chat_sessions) AS total_chats,
      (SELECT count(*) FROM tts_history) AS total_tts,
      (SELECT count(*) FROM video_history) AS total_videos,
      (SELECT count(*) FROM payments) AS total_payments,
      (SELECT count(*) FROM referrals) AS total_referrals,
      (SELECT count(*) FROM pending_generations) AS total_pending,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'succeeded') AS total_revenue,
      (SELECT COALESCE(SUM(tokens), 0) FROM user_balances) AS total_tokens,
      -- Today
      (SELECT count(*) FROM user_balances WHERE created_at >= $1) AS today_users,
      (SELECT count(*) FROM image_history WHERE created_at >= $1) AS today_images,
      (SELECT count(*) FROM chat_sessions WHERE created_at >= $1) AS today_chats,
      (SELECT count(*) FROM tts_history WHERE created_at >= $1) AS today_tts,
      (SELECT count(*) FROM video_history WHERE created_at >= $1) AS today_videos,
      (SELECT count(*) FROM payments WHERE created_at >= $1) AS today_payments,
      (SELECT count(*) FROM referrals WHERE created_at >= $1) AS today_referrals,
      -- Yesterday
      (SELECT count(*) FROM user_balances WHERE created_at >= $2 AND created_at < $1) AS yday_users,
      (SELECT count(*) FROM image_history WHERE created_at >= $2 AND created_at < $1) AS yday_images,
      (SELECT count(*) FROM chat_sessions WHERE created_at >= $2 AND created_at < $1) AS yday_chats,
      (SELECT count(*) FROM tts_history WHERE created_at >= $2 AND created_at < $1) AS yday_tts,
      (SELECT count(*) FROM video_history WHERE created_at >= $2 AND created_at < $1) AS yday_videos,
      (SELECT count(*) FROM payments WHERE created_at >= $2 AND created_at < $1) AS yday_payments,
      (SELECT count(*) FROM referrals WHERE created_at >= $2 AND created_at < $1) AS yday_referrals
  `, [todayStart, ydayStart]);

  const r = counts.rows[0];
  return {
    totalUsers: Number(r.total_users), totalImages: Number(r.total_images),
    totalChats: Number(r.total_chats), totalTTS: Number(r.total_tts),
    totalVideos: Number(r.total_videos), totalPayments: Number(r.total_payments),
    totalReferrals: Number(r.total_referrals), totalPending: Number(r.total_pending),
    totalRevenue: Number(r.total_revenue), totalTokensInSystem: Number(r.total_tokens),
    newUsersToday: Number(r.today_users),
    today: { users: Number(r.today_users), images: Number(r.today_images), chats: Number(r.today_chats), tts: Number(r.today_tts), videos: Number(r.today_videos), payments: Number(r.today_payments), referrals: Number(r.today_referrals) },
    yesterday: { users: Number(r.yday_users), images: Number(r.yday_images), chats: Number(r.yday_chats), tts: Number(r.yday_tts), videos: Number(r.yday_videos), payments: Number(r.yday_payments), referrals: Number(r.yday_referrals) },
  };
}

async function getUsers(pool: Pool) {
  const twoMinAgo = new Date(Date.now() - 120000).toISOString();
  const { rows } = await pool.query(`
    SELECT u.id, u.email, u.created_at, b.tokens, b.referral_code, b.total_referral_earnings,
           b.banned_at, b.ban_reason,
           (SELECT count(*) FROM image_history WHERE user_id = u.id) AS image_count,
           (SELECT count(*) FROM chat_sessions WHERE user_id = u.id) AS chat_count,
           (SELECT count(*) FROM tts_history WHERE user_id = u.id) AS tts_count,
           (SELECT count(*) FROM video_history WHERE user_id = u.id) AS video_count,
           p.last_seen, p.device_type,
           CASE WHEN p.last_seen > $1 THEN true ELSE false END AS is_online
    FROM app_users u
    LEFT JOIN user_balances b ON b.user_id = u.id
    LEFT JOIN user_presence p ON p.user_id = u.id
    WHERE u.is_active = true
    ORDER BY u.created_at DESC
  `, [twoMinAgo]);

  return rows.map(r => ({
    ...r,
    tokens: Number(r.tokens ?? 0),
    total_referral_earnings: Number(r.total_referral_earnings ?? 0),
    imageCount: Number(r.image_count), chatCount: Number(r.chat_count),
    ttsCount: Number(r.tts_count), videoCount: Number(r.video_count),
  }));
}

async function getPresence(pool: Pool) {
  const twoMinAgo = new Date(Date.now() - 120000).toISOString();
  const { rows } = await pool.query('SELECT * FROM user_presence WHERE last_seen >= $1 ORDER BY last_seen DESC', [twoMinAgo]);
  return rows;
}

async function getUserGenerations(pool: Pool, userId: string) {
  const [images, videos, chats, tts] = await Promise.all([
    pool.query('SELECT * FROM image_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [userId]),
    pool.query('SELECT * FROM video_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [userId]),
    pool.query('SELECT * FROM chat_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [userId]),
    pool.query('SELECT * FROM tts_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [userId]),
  ]);
  return { images: images.rows, videos: videos.rows, chats: chats.rows, tts: tts.rows };
}
