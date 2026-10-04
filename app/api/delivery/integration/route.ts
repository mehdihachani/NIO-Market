import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { encryptSecret } from '@/lib/crypto';

async function ownStore(user: any, storeId?: string) {
  const staff = user.role === 'OWNER' || user.role === 'ADMIN';
  return db.store.findFirst({ where: staff ? { id: String(storeId || '') } : { id: String(storeId || ''), merchantId: user.merchant?.id } });
}

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({error:'غير مصرح'},{status:401});
  const storeId = new URL(req.url).searchParams.get('storeId') || '';
  const store = await ownStore(user, storeId);
  if (!store) return NextResponse.json({error:'المتجر غير موجود'},{status:404});
  const integration = await db.deliveryIntegration.findUnique({where:{storeId:store.id},select:{id:true,providerName:true,baseUrl:true,enabled:true,createdAt:true,updatedAt:true,apiKeyEncrypted:true,apiSecretEncrypted:true,extraConfigEncrypted:true}});
  if (!integration) return NextResponse.json({integration:null});
  return NextResponse.json({integration:{id:integration.id,providerName:integration.providerName,baseUrl:integration.baseUrl,enabled:integration.enabled,hasApiKey:!!integration.apiKeyEncrypted,hasApiSecret:!!integration.apiSecretEncrypted,hasExtraConfig:!!integration.extraConfigEncrypted,createdAt:integration.createdAt,updatedAt:integration.updatedAt}});
}

export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({error:'غير مصرح'},{status:401});
  const b = await req.json();
  const store = await ownStore(user, b.storeId);
  if (!store) return NextResponse.json({error:'المتجر غير موجود'},{status:404});
  const providerName = String(b.providerName || '').trim().slice(0,100);
  if (!providerName) return NextResponse.json({error:'أدخل اسم شركة التوصيل'},{status:400});
  const baseUrl = String(b.baseUrl || '').trim().slice(0,500) || null;
  if (baseUrl && !/^https:\/\//i.test(baseUrl)) return NextResponse.json({error:'رابط API يجب أن يبدأ بـ https://'},{status:400});
  const existing = await db.deliveryIntegration.findUnique({where:{storeId:store.id}});
  const apiKey = String(b.apiKey || '').trim();
  const apiSecret = String(b.apiSecret || '').trim();
  const extraConfig = String(b.extraConfig || '').trim();
  const data:any = {providerName,baseUrl,enabled:b.enabled===true};
  if (apiKey) data.apiKeyEncrypted = encryptSecret(apiKey);
  else if (existing) data.apiKeyEncrypted = existing.apiKeyEncrypted;
  if (apiSecret) data.apiSecretEncrypted = encryptSecret(apiSecret);
  else if (existing) data.apiSecretEncrypted = existing.apiSecretEncrypted;
  if (extraConfig) data.extraConfigEncrypted = encryptSecret(extraConfig);
  else if (existing) data.extraConfigEncrypted = existing.extraConfigEncrypted;
  const integration = existing
    ? await db.deliveryIntegration.update({where:{storeId:store.id},data})
    : await db.deliveryIntegration.create({data:{storeId:store.id,...data}});
  return NextResponse.json({ok:true,integration:{id:integration.id,providerName:integration.providerName,baseUrl:integration.baseUrl,enabled:integration.enabled,hasApiKey:!!integration.apiKeyEncrypted,hasApiSecret:!!integration.apiSecretEncrypted,hasExtraConfig:!!integration.extraConfigEncrypted}});
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({error:'غير مصرح'},{status:401});
  const storeId = new URL(req.url).searchParams.get('storeId') || '';
  const store = await ownStore(user, storeId);
  if (!store) return NextResponse.json({error:'المتجر غير موجود'},{status:404});
  await db.deliveryIntegration.deleteMany({where:{storeId:store.id}});
  return NextResponse.json({ok:true});
}
