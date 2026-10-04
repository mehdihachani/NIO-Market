import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
const statuses = ['NEW','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED','RETURNED'] as const;
const terminal = new Set(['CANCELLED','RETURNED']);
export async function PATCH(req: Request) {
  const user = await currentUser(); if (!user) return NextResponse.json({error:'غير مصرح'},{status:401});
  const staff=user.role==='OWNER'||user.role==='ADMIN'; if(!staff&&!user.merchant)return NextResponse.json({error:'غير مصرح'},{status:401});
  const body = await req.json().catch(()=>({})); const orderId=String(body.orderId||''); const status=String(body.status||'');
  if(!orderId||!statuses.includes(status as any))return NextResponse.json({error:'بيانات غير صالحة'},{status:400});
  const order=await db.order.findFirst({where:staff?{id:orderId}:{id:orderId,store:{merchantId:user.merchant!.id}},include:{items:true}}); if(!order)return NextResponse.json({error:'الطلب غير موجود'},{status:404});
  if(terminal.has(order.status)&&status!==order.status)return NextResponse.json({error:'لا يمكن تغيير طلب مغلق'},{status:409});
  const updated=await db.$transaction(async tx=>{
    const data:any={status:status as any};
    if(body.trackingNumber!==undefined)data.trackingNumber=String(body.trackingNumber||'').slice(0,100)||null;
    if(body.deliveryProvider!==undefined)data.deliveryProvider=String(body.deliveryProvider||'').slice(0,80)||null;
    if(body.deliveryLabelUrl!==undefined)data.deliveryLabelUrl=String(body.deliveryLabelUrl||'').slice(0,500)||null;
    const wasClosed=terminal.has(order.status), nowClosed=terminal.has(status);
    if(nowClosed&&!wasClosed){for(const item of order.items)await tx.product.updateMany({where:{id:item.productId,storeId:order.storeId},data:{stock:{increment:item.quantity}}});}
    return tx.order.update({where:{id:order.id},data});
  });
  await audit({userId:user.id,action:'ORDER_STATUS_CHANGED',entity:'Order',entityId:order.id,metadata:{from:order.status,to:status}});
  return NextResponse.json({ok:true,order:updated});
}
