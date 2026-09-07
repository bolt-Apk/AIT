import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { getUserId } from '../lib/auth.js';
import { addTokens } from '../lib/billing.js';
import crypto from 'node:crypto';

const ALLOWED_ORIGINS = ['https://ai-taip.com', 'https://www.ai-taip.com', 'http://localhost:5173', 'http://localhost:4173'];

export default function registerPaymentRoutes(app: FastifyInstance, pool: Pool) {

  // ---- Create payment ----
  app.post<{ Body: { tokens?: number } }>('/api/payments/create', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    const { tokens } = request.body;
    if (!tokens || tokens < 1 || tokens > 10000) return reply.code(400).send({ error: 'Укажите количество токенов (1–10000)' });

    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;
    if (!shopId || !secretKey) return reply.code(503).send({ error: 'Платёжная система не настроена' });

    const { rows: [payment] } = await pool.query(
      'INSERT INTO payments (user_id, amount, tokens, status) VALUES ($1, $2, $3, $4) RETURNING id',
      [userId, tokens, tokens, 'pending'],
    );

    const origin = request.headers.origin as string || '';
    const returnUrl = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

    const yooRes = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Idempotence-Key': payment.id,
      },
      body: JSON.stringify({
        amount: { value: tokens.toFixed(2), currency: 'RUB' },
        confirmation: { type: 'redirect', return_url: `${returnUrl}/settings?payment=success` },
        capture: true,
        description: `Покупка ${tokens} токенов для AI-taip.com`,
        metadata: { payment_id: payment.id, user_id: userId, tokens },
      }),
    });

    if (!yooRes.ok) {
      console.error('YooKassa error:', await yooRes.text());
      return reply.code(502).send({ error: 'Не удалось создать платёж. Попробуйте позже.' });
    }

    const yooResult = await yooRes.json() as any;
    await pool.query('UPDATE payments SET yookassa_id = $1 WHERE id = $2', [yooResult.id, payment.id]);
    return { payment_url: yooResult.confirmation.confirmation_url, payment_id: payment.id };
  });

  // ---- YooKassa webhook ----
  app.post('/api/webhooks/yookassa', async (request, reply) => {
    const rawBody = JSON.stringify(request.body);
    const isValid = await verifyWebhook(rawBody, request.headers as Record<string, string>);
    if (!isValid) return reply.code(403).send({ error: 'Forbidden' });

    const body = request.body as any;
    const event = body.event;
    if (event !== 'payment.succeeded' && event !== 'payment.canceled') return { ok: true };

    const paymentObj = body.object;
    if (!paymentObj?.id) return reply.code(400).send({ error: 'Invalid payload' });

    // Find payment by yookassa_id or metadata
    let { rows: [payment] } = await pool.query('SELECT id, user_id, tokens, status FROM payments WHERE yookassa_id = $1', [paymentObj.id]);
    if (!payment && paymentObj.metadata?.payment_id) {
      ({ rows: [payment] } = await pool.query('SELECT id, user_id, tokens, status FROM payments WHERE id = $1', [paymentObj.metadata.payment_id]));
    }
    if (!payment) return reply.code(404).send({ error: 'Payment not found' });

    if (event === 'payment.succeeded') {
      // Atomically transition pending → succeeded
      const { rows: [updated] } = await pool.query(
        "UPDATE payments SET status = 'succeeded', yookassa_id = $1, updated_at = now() WHERE id = $2 AND status = 'pending' RETURNING id",
        [paymentObj.id, payment.id],
      );
      if (updated) {
        await addTokens(pool, payment.user_id, Number(payment.tokens));
      }
    } else if (event === 'payment.canceled') {
      await pool.query("UPDATE payments SET status = 'canceled', updated_at = now() WHERE id = $1 AND status = 'pending'", [payment.id]);
    }
    return { ok: true };
  });

  // ---- Register referral ----
  app.post<{ Body: { referral_code?: string } }>('/api/referrals/register', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.code(401).send({ error: 'Необходима авторизация' });
    const { referral_code } = request.body;
    if (!referral_code) return reply.code(400).send({ error: 'Не указан реферальный код' });

    const { rows: [referrer] } = await pool.query('SELECT user_id FROM user_balances WHERE referral_code = $1', [referral_code]);
    if (!referrer) return reply.code(404).send({ error: 'Реферальный код не найден' });
    if (referrer.user_id === userId) return reply.code(400).send({ error: 'Нельзя использовать собственный код' });

    const { rows: [existing] } = await pool.query('SELECT id FROM referrals WHERE referred_id = $1', [userId]);
    if (existing) return { ok: true, message: 'Реферал уже записан' };

    await pool.query('INSERT INTO referrals (referrer_id, referred_id) VALUES ($1, $2)', [referrer.user_id, userId]);
    await pool.query('UPDATE user_balances SET referred_by = $1 WHERE user_id = $2', [referrer.user_id, userId]);
    return { ok: true, message: 'Реферал успешно записан' };
  });
}

async function verifyWebhook(body: string, headers: Record<string, string | string[] | undefined>): Promise<boolean> {
  const secret = process.env.YOOKASSA_SECRET_KEY;
  if (!secret) return false;

  const sig = (headers['x-webhook-signature'] || headers['X-Webhook-Signature']) as string | undefined;
  if (!sig) {
    // Fallback: verify by fetching payment from YooKassa
    const shopId = process.env.YOOKASSA_SHOP_ID;
    if (!shopId) return false;
    let parsed: any;
    try { parsed = JSON.parse(body); } catch { return false; }
    const yookassaId = parsed?.object?.id;
    if (!yookassaId) return false;
    const res = await fetch(`https://api.yookassa.ru/v3/payments/${encodeURIComponent(yookassaId)}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${shopId}:${secret}`).toString('base64')}` },
    });
    if (!res.ok) return false;
    const payment = await res.json() as any;
    return payment.status === parsed.object?.status;
  }

  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const expectedBuf = Buffer.from(expected);
  const sigBuf = Buffer.from(sig);
  if (expectedBuf.length !== sigBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, sigBuf);
}
