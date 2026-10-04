import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizeDomain } from '@/lib/security';
import { audit } from '@/lib/audit';

export async function GET() {
  const user=await currentUser(); if(!user)return NextResponse.json({error:'غير مصرح'},{status:401});
  if(user.role==='OWNER'||user.role==='ADMIN'){
    const stores=await db.store.findMany({include:{merchant:{include:{user:true}}},orderBy:{createdAt:'desc'}});
    return NextResponse.json(stores.map(s=>({id:s.id,name:s.name,slug:s.slug,domain:s.domain,status:s.status,subscriptionPlan:s.subscriptionPlan,subscriptionStatus:s.subscriptionStatus,trialEndsAt:s.trialEndsAt,logoUrl:s.logoUrl,pixelId:s.pixelId,merchantId:s.merchantId,merchantName:s.merchant.name,merchantEmail:s.merchant.user.email})));
  }
  if(!user.merchant)return NextResponse.json({error:'لا يوجد متجر'},{status:404});
  const store=await db.store.findUnique({where:{merchantId:user.merchant.id}}); return NextResponse.json(store?[store]:[]);
}

export async function PATCH(req:Request){
  const user=await currentUser(); if(!user)return NextResponse.json({error:'غير مصرح'},{status:401});
  const body=await req.json().catch(()=>({})); const id=String(body.id||'');
  const canManageAll=user.role==='OWNER'||user.role==='ADMIN';
  const store=await db.store.findFirst({where:canManageAll?{id}:{id,merchantId:user.merchant?.id}}); if(!store)return NextResponse.json({error:'المتجر غير موجود'},{status:404});
  const data:any={};
  if(body.name!==undefined)data.name=String(body.name).trim().slice(0,120);
  if(body.domain!==undefined)data.domain=normalizeDomain(body.domain)||null;
  if(body.logoUrl!==undefined)data.logoUrl=String(body.logoUrl||'').trim().slice(0,1000)||null;
  if(body.pixelId!==undefined)data.pixelId=String(body.pixelId||'').trim().slice(0,80)||null;
  if(body.metaAccessToken!==undefined && canManageAll)data.metaAccessToken=String(body.metaAccessToken||'').trim().slice(0,1000)||null;
  if(body.primaryGreen!==undefined)data.primaryGreen=String(body.primaryGreen).trim().slice(0,20);
  if(body.primaryBlue!==undefined)data.primaryBlue=String(body.primaryBlue).trim().slice(0,20);
  if(canManageAll&&body.status!==undefined&&['ACTIVE','SUSPENDED','ARCHIVED'].includes(body.status))data.status=body.status;
  if(canManageAll&&body.trialEndsAt!==undefined&&body.subscriptionStatus==='TRIAL'){const d=new Date(String(body.trialEndsAt));if(!Number.isNaN(d.getTime()))data.trialEndsAt=d;}
  if(canManageAll&&body.subscriptionPlan!==undefined&&['STARTER','GROWTH','PRO'].includes(body.subscriptionPlan))data.subscriptionPlan=body.subscriptionPlan;
  if(canManageAll&&body.subscriptionStatus!==undefined&&['TRIAL','ACTIVE','PAST_DUE','CANCELLED'].includes(body.subscriptionStatus)){data.subscriptionStatus=body.subscriptionStatus; if(body.subscriptionStatus==='TRIAL')data.trialEndsAt=store.trialEndsAt && new Date(store.trialEndsAt).getTime()>Date.now()?store.trialEndsAt:new Date(Date.now()+14*24*60*60*1000);}
  if(!Object.keys(data).length)return NextResponse.json({error:'لا توجد تغييرات'},{status:400});
  if(data.domain){const conflict=await db.store.findFirst({where:{domain:data.domain,id:{not:store.id}},select:{id:true}});if(conflict)return NextResponse.json({error:'هذا النطاق مرتبط بمتجر آخر'},{status:409});}
  const updated=await db.store.update({where:{id},data}); await audit({userId:user.id,action:'STORE_UPDATED',entity:'Store',entityId:id,metadata:Object.keys(data)}); return NextResponse.json(updated);
}
