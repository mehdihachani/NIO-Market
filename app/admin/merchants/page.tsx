import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import MerchantsClient from './MerchantsClient';
export default async function MerchantsPage(){const u=await currentUser();if(!u)redirect('/login');if(u.role!=='OWNER'&&u.role!=='ADMIN')redirect('/admin');const merchants=await db.merchant.findMany({include:{user:true,store:true},orderBy:{createdAt:'desc'}});return <MerchantsClient initialMerchants={merchants.map(m=>({id:m.id,name:m.name,email:m.user.email,stores:m.store?[{name:m.store.name,slug:m.store.slug}]:[]}))}/>}
