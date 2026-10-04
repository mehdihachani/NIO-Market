import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import PurchasesClient from './PurchasesClient';
export default async function Purchases(){const u=await currentUser();if(!u||(u.role!=='OWNER'&&u.role!=='ADMIN'))redirect('/admin');const items=await db.paymentPurchase.findMany({orderBy:{createdAt:'desc'},take:100,include:{reviewedBy:{select:{name:true,email:true}},store:{select:{name:true,slug:true}}}});return <PurchasesClient initial={items.map(x=>({id:x.id,fullName:x.fullName,email:x.email,storeName:x.storeName,slug:x.slug,status:x.status,proofOriginalName:x.proofOriginalName,proofSize:x.proofSize,reviewNote:x.reviewNote,createdAt:x.createdAt.toISOString(),store:x.store}))}/>}
