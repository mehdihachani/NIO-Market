import { NextResponse } from 'next/server';
import { currentUser, hashPassword } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateTemporaryPassword } from '@/lib/password';
import { sendMerchantWelcomeEmail } from '@/lib/mailer';
import { audit } from '@/lib/audit';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await currentUser();
  if (!staff || (staff.role !== 'OWNER' && staff.role !== 'ADMIN')) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  const { id } = await params;
  const purchase = await db.paymentPurchase.findUnique({ where: { id }, include: { user: true, store: true } });
  if (!purchase || purchase.status !== 'APPROVED' || !purchase.user || !purchase.store) return NextResponse.json({ error: 'الطلب المعتمد غير مكتمل.' }, { status: 409 });

  const password = generateTemporaryPassword();
  await db.user.update({ where: { id: purchase.user.id }, data: { passwordHash: hashPassword(password), sessionVersion: { increment: 1 } } });
  const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  const result = await sendMerchantWelcomeEmail({ to: purchase.user.email, name: purchase.user.name || purchase.fullName, storeName: purchase.store.name, password, storeUrl: base ? `${base}/login` : '/login' });
  await audit({ userId: staff.id, action: 'PURCHASE_CREDENTIALS_RESENT', entity: 'PaymentPurchase', entityId: id, metadata: { userId: purchase.user.id, emailSent: result.sent }, ipAddress: req.headers.get('x-forwarded-for') || undefined });
  return NextResponse.json({ ok: true, emailSent: result.sent, temporaryPassword: result.sent ? undefined : password, message: result.sent ? 'تم توليد كلمة مرور جديدة وإرسالها إلى البريد.' : 'تم توليد كلمة مرور جديدة، لكن خدمة البريد غير مهيأة.' });
}
