import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { isSubscriptionUsable } from '@/lib/merchant';
import MetaPixel from '@/components/MetaPixel';
import StoreClient from './StoreClient';
export default async function StorePage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const store=await db.store.findUnique({where:{slug},include:{products:{where:{active:true},orderBy:{createdAt:'desc'}},deliveryRates:{where:{enabled:true},orderBy:{wilayaCode:'asc'}}}});if(!store || store.status !== 'ACTIVE' || !isSubscriptionUsable(store))return notFound();return <><MetaPixel pixelId={store.pixelId}/><StoreClient store={store} products={store.products} deliveryRates={store.deliveryRates}/></>}
