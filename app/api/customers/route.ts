import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
export async function GET(req: Request) {
  const user = await currentUser(); if (!user?.merchant) return NextResponse.json({error:'غير مصرح'},{status:401});
  const url = new URL(req.url); const q = (url.searchParams.get('q')||'').trim();
  const stores = await db.store.findMany({where:{merchantId:user.merchant.id},select:{id:true}}); const ids=stores.map(s=>s.id);
  const customers = await db.customer.findMany({where:{storeId:{in:ids}, ...(q?{OR:[{name:{contains:q,mode:'insensitive'}},{phone:{contains:q}}]}:{})},orderBy:{updatedAt:'desc'},take:100,include:{_count:{select:{orders:true}}}});
  return NextResponse.json(customers);
}
