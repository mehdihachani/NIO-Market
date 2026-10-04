import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { COOKIE, createSession, verifyPassword } from '@/lib/auth';
import { clientIp, normalizeEmail, rateLimit } from '@/lib/security';
import { audit } from '@/lib/audit';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ip = clientIp(req);
  const rl = rateLimit(`login:${ip}`, 8, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: 'محاولات كثيرة، حاول بعد دقائق.' }, { status: 429 });
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) { await audit({action:'LOGIN_FAILED',entity:'User',metadata:{email},ipAddress:ip}); return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 }); }
  await audit({userId:user.id,action:'LOGIN',entity:'User',entityId:user.id,ipAddress:ip});
  const res = NextResponse.json({ ok: true, role: user.role });
  res.cookies.set(COOKIE, await createSession(user.id), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return res;
}
