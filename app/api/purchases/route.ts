import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalizeEmail, rateLimit, randomToken } from '@/lib/security';
import { normalizeSlug, PURCHASE_PRICE_DZD, validatePurchaseAvailability } from '@/lib/purchase';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

const MAX=5*1024*1024;
const ALLOWED=new Map([['image/jpeg','jpg'],['image/png','png'],['image/webp','webp'],['application/pdf','pdf']]);
const proofRoot=path.resolve(process.env.PAYMENT_PROOF_DIR || './private/payment-proofs');

export async function POST(req:Request){
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  if(!rateLimit(`purchase:${ip}`,5,60*60*1000).ok) return NextResponse.json({error:'محاولات كثيرة. حاول لاحقاً.'},{status:429});
  try{
    const form=await req.formData();
    const fullName=String(form.get('fullName')||'').trim().slice(0,120);
    const email=normalizeEmail(String(form.get('email')||''));
    const storeName=String(form.get('storeName')||'').trim().slice(0,120);
    const slug=normalizeSlug(String(form.get('slug')||''));
    const proof=form.get('proof');
    if(fullName.length<2||!email.includes('@')||storeName.length<2||slug.length<3) return NextResponse.json({error:'أكمل الاسم والبريد واسم المتجر والرابط.'},{status:400});
    if(!(proof instanceof File)) return NextResponse.json({error:'ارفع إثبات الدفع.'},{status:400});
    const ext=ALLOWED.get(proof.type); if(!ext || proof.size>MAX) return NextResponse.json({error:'إثبات الدفع يجب أن يكون PDF أو JPG أو PNG أو WEBP وبحجم أقصى 5MB.'},{status:400});
    const availability=await validatePurchaseAvailability(email,slug);
    if(availability.user) return NextResponse.json({error:'هذا البريد مستخدم بالفعل. استخدم بريداً آخر أو سجّل الدخول.'},{status:409});
    if(availability.store) return NextResponse.json({error:'رابط المتجر مستخدم بالفعل. اختر رابطاً آخر.'},{status:409});
    if(availability.pending) return NextResponse.json({error:'يوجد طلب شراء قيد المراجعة بهذا البريد.'},{status:409});
    const id=randomToken(18); const dir=path.join(proofRoot,id); await mkdir(dir,{recursive:true});
    const bytes=Buffer.from(await proof.arrayBuffer());
    const validMagic = ext==='jpg' ? bytes.subarray(0,3).equals(Buffer.from([0xff,0xd8,0xff])) : ext==='png' ? bytes.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])) : ext==='webp' ? bytes.subarray(0,4).toString('ascii')==='RIFF' && bytes.subarray(8,12).toString('ascii')==='WEBP' : bytes.subarray(0,5).toString('ascii')==='%PDF-';
    if(!validMagic) return NextResponse.json({error:'نوع الملف لا يطابق محتواه.'},{status:400});
    const filename=`proof.${ext}`; await writeFile(path.join(dir,filename),bytes,{flag:'wx'});
    let purchase;
    try {
      purchase=await db.$transaction(async tx => {
        const [existingUser, existingStore, pending] = await Promise.all([
          tx.user.findUnique({where:{email}, select:{id:true}}),
          tx.store.findUnique({where:{slug}, select:{id:true}}),
          tx.paymentPurchase.findFirst({where:{email,status:{in:['PENDING_PAYMENT','UNDER_REVIEW']}},select:{id:true}}),
        ]);
        if(existingUser) throw new Error('EMAIL_IN_USE');
        if(existingStore) throw new Error('SLUG_IN_USE');
        if(pending) throw new Error('PENDING_PURCHASE');
        return tx.paymentPurchase.create({data:{fullName,email,storeName,slug,status:'UNDER_REVIEW',proofPath:path.join(id,filename),proofOriginalName:proof.name.slice(0,200),proofMimeType:proof.type,proofSize:proof.size, purchasePriceDzd:PURCHASE_PRICE_DZD || null}});
      }, {isolationLevel:'Serializable'});
    } catch (error) {
      await rm(dir,{recursive:true,force:true});
      const code=error instanceof Error ? error.message : '';
      if(code==='EMAIL_IN_USE') return NextResponse.json({error:'هذا البريد مستخدم بالفعل. استخدم بريداً آخر أو سجّل الدخول.'},{status:409});
      if(code==='SLUG_IN_USE') return NextResponse.json({error:'رابط المتجر مستخدم بالفعل. اختر رابطاً آخر.'},{status:409});
      if(code==='PENDING_PURCHASE') return NextResponse.json({error:'يوجد طلب شراء قيد المراجعة بهذا البريد.'},{status:409});
      throw error;
    }
    return NextResponse.json({ok:true,id:purchase.id,message:'تم استلام طلبك وإثبات الدفع. سنراجعه ثم نرسل بيانات الدخول إلى بريدك الإلكتروني.'},{status:201});
  }catch(e){ console.error(e); return NextResponse.json({error:'تعذر إرسال الطلب. حاول مرة أخرى.'},{status:500}); }
}
