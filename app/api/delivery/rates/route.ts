import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { WILAYAS } from '@/lib/data/algeria';

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({error:'غير مصرح'},{status:401});
  const {searchParams}=new URL(req.url); const storeId=searchParams.get('storeId');
  const staff=user.role==='OWNER'||user.role==='ADMIN'; const store=await db.store.findFirst({where:staff?{id:storeId||undefined}:{id:storeId||undefined,merchantId:user.merchant.id}});
  if(!store) return NextResponse.json({error:'المتجر غير موجود'},{status:404});
  const rates=await db.deliveryRate.findMany({where:{storeId:store.id},orderBy:{wilayaCode:'asc'}});
  return NextResponse.json({rates,wilayas:WILAYAS});
}

export async function PUT(req: Request) {
  const user=await currentUser(); if(!user) return NextResponse.json({error:'غير مصرح'},{status:401});
  const staff=user.role==='OWNER'||user.role==='ADMIN'; if(!staff&&!user.merchant)return NextResponse.json({error:'غير مصرح'},{status:401});
  const b=await req.json(); const store=await db.store.findFirst({where:staff?{id:String(b.storeId||'')}:{id:String(b.storeId||''),merchantId:user.merchant!.id}});
  if(!store) return NextResponse.json({error:'المتجر غير موجود'},{status:404});
  const code=String(b.wilayaCode||''); const w=WILAYAS.find(x=>x.code===code);
  if(!w) return NextResponse.json({error:'ولاية غير صالحة'},{status:400});
  const home=Math.max(0,Math.min(100000,Number(b.homeFee)||0)); const desk=Math.max(0,Math.min(100000,Number(b.stopDeskFee)||0));
  const rate=await db.deliveryRate.upsert({where:{storeId_wilayaCode:{storeId:store.id,wilayaCode:code}},update:{wilayaName:w.name,homeFee:home,stopDeskFee:desk,enabled:b.enabled!==false},create:{storeId:store.id,wilayaCode:code,wilayaName:w.name,homeFee:home,stopDeskFee:desk,enabled:b.enabled!==false}});
  return NextResponse.json({ok:true,rate});
}
