import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { clientIp, rateLimit } from '@/lib/security';

const API_VERSION = process.env.META_GRAPH_API_VERSION || 'v24.0';
const GRAPH_HOST = `https://graph.facebook.com/${API_VERSION}`;
function hash(value: string) { return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex'); }

export async function POST(req: Request) {
  const rl = rateLimit(`meta:${clientIp(req)}`, 60, 60_000);
  if (!rl.ok) return NextResponse.json({ error: 'طلبات كثيرة' }, { status: 429 });
  try {
    const body = await req.json();
    const storeSlug = String(body.storeSlug || '').trim();
    const eventName = String(body.eventName || '').trim();
    const store = await db.store.findUnique({ where: { slug: storeSlug }, select: { pixelId: true, metaAccessToken: true } });
    if (!store || !store.pixelId || !store.metaAccessToken) return NextResponse.json({ ok: false, skipped: true });
    const allowed = new Set(['PageView','ViewContent','AddToCart','InitiateCheckout','Purchase']);
    if (!allowed.has(eventName)) return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
    const user = body.user || {};
    const payload = { data: [{ event_name:eventName, event_time:Math.floor(Date.now()/1000), action_source:'website', event_id:String(body.eventId || crypto.randomUUID()), user_data:{ em:user.email?[hash(String(user.email))]:undefined, ph:user.phone?[hash(String(user.phone).replace(/[^0-9+]/g,''))]:undefined }, custom_data:body.customData || undefined }] };
    const response = await fetch(`${GRAPH_HOST}/${store.pixelId}/events?access_token=${encodeURIComponent(store.metaAccessToken)}`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload), cache:'no-store' });
    const result = await response.json().catch(()=>({}));
    if (!response.ok) return NextResponse.json({ok:false,error:'Meta event rejected',details:result},{status:502});
    return NextResponse.json({ok:true,result});
  } catch { return NextResponse.json({ok:false,error:'Unable to send event'},{status:500}); }
}
