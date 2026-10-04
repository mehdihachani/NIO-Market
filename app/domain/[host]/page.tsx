import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { isSubscriptionUsable } from '@/lib/merchant';
import MetaPixel from '@/components/MetaPixel';
import StoreClient from '@/app/store/[slug]/StoreClient';

export default async function DomainStorePage({ params }: { params: Promise<{ host: string }> }) {
  const { host: encodedHost } = await params;
  const host = decodeURIComponent(encodedHost).toLowerCase();
  const store = await db.store.findFirst({
    where: { domain: host },
    include: {
      products: { where: { active: true }, orderBy: { createdAt: 'desc' } },
      deliveryRates: { where: { enabled: true }, orderBy: { wilayaCode: 'asc' } },
    },
  });
  if (!store || store.status !== 'ACTIVE' || !isSubscriptionUsable(store)) return notFound();
  return <><MetaPixel pixelId={store.pixelId} /><StoreClient store={store} products={store.products} deliveryRates={store.deliveryRates} /></>;
}
