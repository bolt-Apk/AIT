import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

const jwtSecret = process.env.JWT_SECRET ?? 'dev-jwt-secret-change-me';

export function issueToken(userId: string) {
  return jwt.sign({ sub: userId }, jwtSecret, { expiresIn: '7d' });
}

export function getUserId(request: { headers: Record<string, string | string[] | undefined> }) {
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

export async function requireUser(request: { headers: Record<string, string | string[] | undefined> }, reply: { code: (c: number) => { send: (b: unknown) => void } }) {
  const userId = getUserId(request);
  if (!userId) { reply.code(401).send({ error: 'Необходима авторизация' }); return null; }
  return userId;
}

export async function requireAdmin(pool: Pool, request: { headers: Record<string, string | string[] | undefined> }, reply: { code: (c: number) => { send: (b: unknown) => void } }) {
  const userId = await requireUser(request, reply);
  if (!userId) return null;
  const { rows } = await pool.query('SELECT id FROM admin_users WHERE id = $1', [userId]);
  if (!rows[0]) { reply.code(403).send({ error: 'Forbidden' }); return null; }
  return userId;
}
