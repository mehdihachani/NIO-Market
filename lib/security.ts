import crypto from 'node:crypto';

const buckets = new Map<string, { count: number; reset: number }>();

export function normalizeEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase().slice(0, 254);
}

export function normalizeDomain(value: unknown) {
  return String(value ?? '')
    .trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .replace(/:\d+$/, '')
    .replace(/\.+$/, '')
    .slice(0, 253);
}

export function clientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for');
  return (forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown').slice(0, 64);
}

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  current.count += 1;
  return { ok: current.count <= limit, remaining: Math.max(0, limit - current.count) };
}

export function randomToken(bytes = 32) { return crypto.randomBytes(bytes).toString('hex'); }
