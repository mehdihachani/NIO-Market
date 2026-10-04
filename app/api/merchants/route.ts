import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, currentUser } from '@/lib/auth';
import { normalizeEmail } from '@/lib/security';
import { WILAYAS } from '@/lib/data/algeria';

export async function POST(req: Request){
 const staff=await currentUser(); if(!staff || (staff.role!=='OWNER'&&staff.role!=='ADMIN')) return NextResponse.json({error:'غير مصرح'},{status:403});
 const b=await req.json(); const name=String(b.name||'').trim().slice(0,120); const email=normalizeEmail(b.email); const password=String(b.password||''); const storeName=String(b.storeName||'').trim().slice(0,120); const slug=String(b.slug||'').trim().toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/^-|-$/g,'').slice(0,60);
 if(name.length<2||!email.includes('@')||password.length<12||storeName.length<2||!slug) return NextResponse.json({error:'أكمل بيانات التاجر والمتجر بشكل صحيح. كلمة المرور 12 حرفًا على الأقل.'},{status:400});
 try { const existing=await db.user.findUnique({where:{email}}); if(existing)return NextResponse.json({error:'هذا البريد الإلكتروني مستخدم مسبقًا.'},{status:409}); const created=await db.$transaction(async tx=>{const user=await tx.user.create({data:{name,email,passwordHash:hashPassword(password),role:'MERCHANT'}});const merchant=await tx.merchant.create({data:{name,userId:user.id}});const store=await tx.store.create({data:{name:storeName,slug,merchantId:merchant.id,trialEndsAt:new Date(Date.now()+14*24*60*60*1000)}}); await tx.deliveryRate.createMany({data:WILAYAS.map(w=>({storeId:store.id,wilayaCode:w.code,wilayaName:w.name,homeFee:600,stopDeskFee:400}))}); return {merchant,store};}); return NextResponse.json({ok:true,...created},{status:201}); } catch { return NextResponse.json({error:'البريد الإلكتروني أو رابط المتجر مستخدم مسبقًا.'},{status:409}); }
}
