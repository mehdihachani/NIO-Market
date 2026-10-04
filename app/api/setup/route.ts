import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { normalizeEmail, rateLimit, clientIp } from '@/lib/security';

export async function POST(req: Request) {
  const ip = clientIp(req); const limit = rateLimit(`bootstrap:${ip}`, 3, 15 * 60_000);
  if (!limit.ok) return NextResponse.json({ error: 'طلبات كثيرة، حاول لاحقًا' }, { status: 429 });
  const secret = process.env.BOOTSTRAP_SECRET;
  if (!secret || secret.length < 24 || req.headers.get('x-bootstrap-secret') !== secret) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  const ownerExists = await db.user.findFirst({ where: { role: 'OWNER' }, select: { id: true } });
  if (ownerExists) return NextResponse.json({ error: 'تم إعداد المنصة مسبقًا' }, { status: 409 });
  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body.email); const password = String(body.password || ''); const name = String(body.name || '').trim().slice(0, 120);
  if (!email.includes('@') || password.length < 12 || name.length < 2) return NextResponse.json({ error: 'البريد والاسم وكلمة مرور من 12 حرفًا مطلوبة' }, { status: 400 });
  const user = await db.user.create({ data: { email, name, passwordHash: hashPassword(password), role: 'OWNER' } });
  return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
}
