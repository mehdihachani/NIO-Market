import { NextResponse } from 'next/server';
import { currentUser, hashPassword } from '@/lib/auth';
import { db } from '@/lib/db';
import { WILAYAS } from '@/lib/data/algeria';
import { generateTemporaryPassword } from '@/lib/password';
import { sendMerchantWelcomeEmail } from '@/lib/mailer';
import { audit } from '@/lib/audit';

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const staff=await currentUser(); if(!staff || (staff.role!=='OWNER'&&staff.role!=='ADMIN')) return NextResponse.json({error:'غير مصرح'},{status:403});
 const {id}=await params; const body=await req.json().catch(()=>({})); const note=String(body.note||'').trim().slice(0,500);
 const purchase=await db.paymentPurchase.findUnique({where:{id}}); if(!purchase) return NextResponse.json({error:'طلب الشراء غير موجود.'},{status:404});
 if(purchase.status==='APPROVED') return NextResponse.json({error:'تمت الموافقة على هذا الطلب مسبقاً.'},{status:409});
 if(purchase.status!=='UNDER_REVIEW') return NextResponse.json({error:'لا يمكن اعتماد هذا الطلب في حالته الحالية.'},{status:409});
 const password=generateTemporaryPassword();
 let created;
 try{
  created=await db.$transaction(async tx=>{
   const user=await tx.user.create({data:{name:purchase.fullName,email:purchase.email,passwordHash:hashPassword(password),role:'MERCHANT'}});
   const merchant=await tx.merchant.create({data:{name:purchase.fullName,userId:user.id}});
   const store=await tx.store.create({data:{name:purchase.storeName,slug:purchase.slug,merchantId:merchant.id,status:'ACTIVE',subscriptionPlan:'STARTER',subscriptionStatus:'ACTIVE'}});
   await tx.deliveryRate.createMany({data:WILAYAS.map(w=>({storeId:store.id,wilayaCode:w.code,wilayaName:w.name,homeFee:600,stopDeskFee:400}))});
   const updated=await tx.paymentPurchase.update({where:{id:purchase.id},data:{status:'APPROVED',userId:user.id,storeId:store.id,reviewedById:staff.id,reviewNote:note||null}});
   return {user,merchant,store,purchase:updated};
  });
 }catch(e){console.error(e);return NextResponse.json({error:'تعذر إنشاء المتجر. ربما البريد أو الرابط مستخدم.'},{status:409});}
 const appUrl=(process.env.NEXT_PUBLIC_APP_URL||'').replace(/\/$/,'');
 const storeUrl=appUrl?`${appUrl}/login`:'/login';
 const email=await sendMerchantWelcomeEmail({to:purchase.email,name:purchase.fullName,storeName:purchase.storeName,password,storeUrl});
 await audit({userId:staff.id,action:'PURCHASE_APPROVED',entity:'PaymentPurchase',entityId:purchase.id,metadata:{storeId:created.store.id,emailSent:email.sent},ipAddress:req.headers.get('x-forwarded-for')||undefined});
 return NextResponse.json({ok:true,storeId:created.store.id,emailSent:email.sent,temporaryPassword:email.sent?undefined:password,message:email.sent?'تم اعتماد الطلب وإرسال بيانات الدخول إلى البريد.':'تم اعتماد الطلب، لكن خدمة البريد غير مهيأة. استخدم كلمة المرور المؤقتة المعروضة لإرسالها للعميل بشكل آمن.'});
}
