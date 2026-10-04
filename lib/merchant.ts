import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';

export async function getMerchantStore(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, include: { merchant: true } });
  if (!user?.merchant) return null;
  return db.store.findUnique({ where: { merchantId: user.merchant.id } });
}

export async function currentMerchantStore() {
  const user = await currentUser();
  if (!user?.merchant || user.role !== 'MERCHANT') return { user: null, store: null };
  const store = await db.store.findUnique({ where: { merchantId: user.merchant.id } });
  return { user, store };
}

export const PLAN_LIMITS = {
  STARTER: { products: 25, monthlyOrders: 250 },
  GROWTH: { products: 250, monthlyOrders: 2500 },
  PRO: { products: 5000, monthlyOrders: 50000 },
} as const;

export function getPlanLimits(plan: string) { return PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.STARTER; }

export function isSubscriptionUsable(store: { subscriptionStatus: string; trialEndsAt: Date | null }) {
  if (store.subscriptionStatus === 'ACTIVE') return true;
  if (store.subscriptionStatus === 'TRIAL') return !!store.trialEndsAt && store.trialEndsAt.getTime() > Date.now();
  return false;
}
