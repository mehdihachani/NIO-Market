import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from './db';

const COOKIE = 'nio_session';
const SECRET = process.env.AUTH_SECRET || '';
if (process.env.NODE_ENV === 'production' && SECRET.length < 32) throw new Error('AUTH_SECRET must be at least 32 characters in production');

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string) {
  try {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const actual = scryptSync(password, salt, 32);
    const expected = Buffer.from(hash, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}

function sign(value: string) { return createHmac('sha256', SECRET).update(value).digest('hex'); }
export async function createSession(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { sessionVersion: true, role: true } });
  if (!user) return '';
  const payload = `${userId}.${Date.now() + 1000 * 60 * 60 * 24 * 30}.${user.sessionVersion}.${user.role}`;
  return `${payload}.${sign(payload)}`;
}
export function readSession(token?: string) {
  if (!token) return null;
  const [userId, exp, version, role, sig] = token.split('.');
  if (!userId || !exp || version === undefined || !role || !sig || Number(exp) < Date.now()) return null;
  const expected = sign(`${userId}.${exp}.${version}.${role}`);
  if (sig.length !== expected.length) return null;
  try { if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null; } catch { return null; }
  return { userId, version: Number(version), role };
}

export async function currentUser() {
  const jar = await cookies();
  const session = readSession(jar.get(COOKIE)?.value);
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.userId }, include: { merchant: true } });
  if (!user || user.sessionVersion !== session.version) return null;
  return user;
}

export async function requireUser() {
  const user = await currentUser();
  return user;
}

export async function requireStaff() {
  const user = await currentUser();
  return user && (user.role === 'OWNER' || user.role === 'ADMIN') ? user : null;
}

export { COOKIE };
