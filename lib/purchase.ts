import { db } from '@/lib/db';

export const PURCHASE_PRICE_DZD = Number(process.env.STORE_PURCHASE_PRICE_DZD || 0);

export function normalizeSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

export async function validatePurchaseAvailability(email: string, slug: string) {
  const [user, store, pending] = await Promise.all([
    db.user.findUnique({ where: { email }, select: { id: true } }),
    db.store.findUnique({ where: { slug }, select: { id: true } }),
    db.paymentPurchase.findFirst({
      where: { email, status: { in: ['PENDING_PAYMENT', 'UNDER_REVIEW'] } },
      select: { id: true },
    }),
  ]);
  return { user, store, pending };
}
