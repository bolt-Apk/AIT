import { Pool } from 'pg';

export async function isFreeMode(pool: Pool): Promise<boolean> {
  const { rows } = await pool.query('SELECT free_mode FROM app_settings WHERE id = 1');
  return rows[0]?.free_mode === true;
}

export async function getApiKey(pool: Pool): Promise<string | null> {
  const envKey = process.env.AITUNNEL_API_KEY;
  if (envKey) return envKey;
  const { rows } = await pool.query('SELECT aitunnel_api_key FROM app_settings WHERE id = 1');
  return rows[0]?.aitunnel_api_key || null;
}

export async function getBalance(pool: Pool, userId: string): Promise<number> {
  const { rows } = await pool.query(
    'INSERT INTO user_balances (user_id) VALUES ($1) ON CONFLICT (user_id) DO UPDATE SET updated_at = user_balances.updated_at RETURNING tokens',
    [userId],
  );
  return Number(rows[0].tokens);
}

export async function deductTokens(pool: Pool, userId: string, amount: number): Promise<number | null> {
  const { rows } = await pool.query(
    'UPDATE user_balances SET tokens = tokens - $1, updated_at = now() WHERE user_id = $2 AND tokens >= $1 RETURNING tokens',
    [amount, userId],
  );
  return rows[0] ? Number(rows[0].tokens) : null;
}

export async function addTokens(pool: Pool, userId: string, amount: number): Promise<number> {
  const { rows } = await pool.query(
    'UPDATE user_balances SET tokens = tokens + $1, updated_at = now() WHERE user_id = $2 RETURNING tokens',
    [amount, userId],
  );
  return Number(rows[0]?.tokens ?? 0);
}
