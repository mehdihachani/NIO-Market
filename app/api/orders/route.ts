import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/security';
import { getPlanLimits, isSubscriptionUsable } from '@/lib/merchant';

function cleanPhone(value: unknown) { return String(value || '').replace(/[^0-9+]/g, '').slice(0, 20); }
function json(data: unknown, init?: ResponseInit) { const r=NextResponse.json(data, init); r.headers.set('Cache-Control','no-store'); return r; }

export async function POST(req: Request) {
  const ip=clientIp(req); const rl=rateLimit(`checkout:${ip}`,20,10*60_000); if(!rl.ok) return json({error:'طلبات كثيرة من نفس المصدر، حاول بعد دقائق.'},{status:429});
  try {
    const body = await req.json().catch(() => ({}));
    const storeSlug=String(body.storeSlug||'').trim();
    const idempotencyKey=String(body.idempotencyKey||crypto.randomUUID()).slice(0,100);
    const items=Array.isArray(body.items)?body.items:[];
    const customerName=String(body.customerName||'').trim().slice(0,120);
    const customerPhone=cleanPhone(body.customerPhone);
    const wilayaCode=String(body.wilayaCode||'').trim();
    const wilaya=String(body.wilaya||'').trim().slice(0,80);
    const commune=String(body.commune||'').trim().slice(0,100);
    const address=body.address?String(body.address).trim().slice(0,300):null;
    const deliveryType=body.deliveryType==='STOP_DESK'?'STOP_DESK':'HOME';
    if(!storeSlug||!items.length||customerName.length<2||customerPhone.length<8||!wilayaCode||!wilaya||commune.length<2)return json({error:'يرجى إكمال بيانات الطلب بشكل صحيح'},{status:400});
    const store=await db.store.findUnique({where:{slug:storeSlug},include:{products:true,deliveryRates:true}});
    if(!store || store.status !== 'ACTIVE' || !isSubscriptionUsable(store))return json({error:'المتجر غير متاح حاليًا'},{status:404});
    const existing=await db.order.findFirst({where:{storeId:store.id,idempotencyKey}});
    if(existing)return json({ok:true,orderId:existing.id,orderNumber:existing.orderNumber,total:existing.total,deliveryFee:existing.deliveryFee,replayed:true});
    const limits=getPlanLimits(String(store.subscriptionPlan)); const monthStart=new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0,0,0,0); const monthlyOrders=await db.order.count({where:{storeId:store.id,createdAt:{gte:monthStart}}}); if(monthlyOrders>=limits.monthlyOrders)return json({error:'وصل المتجر إلى حد الطلبات الشهري في خطته الحالية.'},{status:403});
    const rate=store.deliveryRates.find(r=>r.wilayaCode===wilayaCode&&r.enabled);
    if(!rate)return json({error:'التوصيل غير متاح حاليًا لهذه الولاية'},{status:400});
    const deliveryFee=deliveryType==='STOP_DESK'?rate.stopDeskFee:rate.homeFee;
    const map = new Map<string, typeof store.products[number]>(store.products.map(p => [p.id, p])); const normalized:{productId:string;quantity:number;price:number}[]=[]; let subtotal=0;
    for(const item of items.slice(0,50)){
      const p=map.get(String(item?.productId)); const qty=Math.max(1,Math.min(99,Number(item?.quantity)||1));
      if(!p||!p.active||p.stock<qty)continue;
      subtotal+=p.price*qty; normalized.push({productId:p.id,quantity:qty,price:p.price});
    }
    if(!normalized.length)return json({error:'المنتجات المطلوبة غير متاحة أو نفدت الكمية'},{status:400});
    const order=await db.$transaction(async tx=>{
      const again=await tx.order.findFirst({where:{storeId:store.id,idempotencyKey}}); if(again)return again;
      for(const item of normalized){const result=await tx.product.updateMany({where:{id:item.productId,storeId:store.id,active:true,stock:{gte:item.quantity}},data:{stock:{decrement:item.quantity}}});if(result.count!==1)throw new Error('STOCK_CHANGED');}
      const customer=await tx.customer.upsert({where:{storeId_phone:{storeId:store.id,phone:customerPhone}},update:{name:customerName,wilaya,commune,address},create:{storeId:store.id,name:customerName,phone:customerPhone,wilaya,commune,address}});
      const orderNumber=`NIO-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      return tx.order.create({data:{storeId:store.id,customerId:customer.id,orderNumber,idempotencyKey,customerName,customerPhone,wilayaCode,wilaya,commune,address,total:subtotal+deliveryFee,deliveryFee,deliveryType,items:{create:normalized}}});
    });
    return json({ok:true,orderId:order.id,orderNumber:order.orderNumber,total:order.total,subtotal,deliveryFee},{status:201});
  }catch(e){if(e instanceof Error&&e.message==='STOCK_CHANGED')return json({error:'تغيّرت الكمية المتاحة، يرجى تحديث السلة والمحاولة مجددًا.'},{status:409});return json({error:'تعذر إنشاء الطلب حاليًا'},{status:500});}
}
