import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { getPlanLimits, currentMerchantStore, isSubscriptionUsable } from '@/lib/merchant';
import { audit } from '@/lib/audit';

async function getStore() {
  const { store } = await currentMerchantStore();
  return store;
}

export async function GET() {
  const store = await getStore();
  if (!store) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  return NextResponse.json(await db.product.findMany({ where: { storeId: store.id }, orderBy: { createdAt: 'desc' } }));
}

export async function POST(req: Request) {
  const user = await currentUser();
  const store = await getStore();
  if (!user || !store) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  if (!isSubscriptionUsable(store)) return NextResponse.json({ error: 'اشتراك المتجر غير نشط.' }, { status: 402 });
  const limit = getPlanLimits(String(store.subscriptionPlan)).products;
  const count = await db.product.count({ where: { storeId: store.id } });
  if (count >= limit) return NextResponse.json({ error: `وصلت إلى حد ${limit} منتجًا في خطتك الحالية.` }, { status: 403 });
  const body = await req.json();
  const name = String(body.name || '').trim().slice(0, 160);
  const price = Number(body.price);
  const stock = Number(body.stock);
  if (!name || !Number.isFinite(price) || price < 0 || !Number.isFinite(stock) || stock < 0) return NextResponse.json({ error: 'بيانات المنتج غير صحيحة' }, { status: 400 });
  const base = (String(body.slug || name).toLowerCase().trim().replace(/[^a-z0-9\u0600-\u06ff]+/g, '-').replace(/^-|-$/g, '') || `product-${Date.now()}`);
  const slug = `${base}-${Date.now().toString(36)}`;
  const product = await db.product.create({ data: { storeId: store.id, name, slug, price: Math.round(price), stock: Math.floor(stock), description: body.description ? String(body.description).slice(0, 2000) : null, imageUrl: body.imageUrl ? String(body.imageUrl).slice(0, 1000) : null } });
  await audit({ userId: user.id, action: 'PRODUCT_CREATED', entity: 'Product', entityId: product.id, metadata: { storeId: store.id } });
  return NextResponse.json(product, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await currentUser();
  const store = await getStore();
  if (!user || !store) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  if (!isSubscriptionUsable(store)) return NextResponse.json({ error: 'اشتراك المتجر غير نشط.' }, { status: 402 });
  const body = await req.json();
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ error: 'معرف المنتج مطلوب' }, { status: 400 });
  const existing = await db.product.findFirst({ where: { id, storeId: store.id } });
  if (!existing) return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 });
  const data: any = {};
  if (body.name !== undefined) data.name = String(body.name).trim().slice(0, 160);
  if (body.price !== undefined) data.price = Math.max(0, Math.round(Number(body.price) || 0));
  if (body.stock !== undefined) data.stock = Math.max(0, Math.floor(Number(body.stock) || 0));
  if (body.active !== undefined) data.active = Boolean(body.active);
  if (body.description !== undefined) data.description = String(body.description).slice(0, 2000);
  if (body.imageUrl !== undefined) data.imageUrl = String(body.imageUrl).slice(0, 1000);
  const updated = await db.product.update({ where: { id }, data });
  await audit({ userId: user.id, action: 'PRODUCT_UPDATED', entity: 'Product', entityId: id, metadata: Object.keys(data) });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  const store = await getStore();
  if (!user || !store) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const id = String(new URL(req.url).searchParams.get('id') || '');
  if (!id) return NextResponse.json({ error: 'معرف المنتج مطلوب' }, { status: 400 });
  const existing = await db.product.findFirst({ where: { id, storeId: store.id } });
  if (!existing) return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 });
  const used = await db.orderItem.count({ where: { productId: id } });
  if (used) return NextResponse.json({ error: 'لا يمكن حذف منتج مرتبط بطلبات؛ عطّله بدلًا من ذلك.' }, { status: 409 });
  await db.product.delete({ where: { id } });
  await audit({ userId: user.id, action: 'PRODUCT_DELETED', entity: 'Product', entityId: id, metadata: { storeId: store.id } });
  return NextResponse.json({ ok: true });
}
