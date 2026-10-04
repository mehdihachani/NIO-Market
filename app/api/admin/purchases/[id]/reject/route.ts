import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const staff=await currentUser(); if(!staff || (staff.role!=='OWNER'&&staff.role!=='ADMIN')) return NextResponse.json({error:'غير مصرح'},{status:403});
 const {id}=await params; const body=await req.json().catch(()=>({})); const note=String(body.note||'').trim().slice(0,500); if(!note)return NextResponse.json({error:'اكتب سبب الرفض.'},{status:400});
 const p=await db.paymentPurchase.findUnique({where:{id}}); if(!p)return NextResponse.json({error:'الطلب غير موجود.'},{status:404});
 if(p.status!=='UNDER_REVIEW')return NextResponse.json({error:'لا يمكن رفض الطلب في حالته الحالية.'},{status:409});
 const updated=await db.paymentPurchase.update({where:{id},data:{status:'REJECTED',reviewedById:staff.id,reviewNote:note}});
 await audit({userId:staff.id,action:'PURCHASE_REJECTED',entity:'PaymentPurchase',entityId:id,metadata:{note},ipAddress:req.headers.get('x-forwarded-for')||undefined});
 return NextResponse.json({ok:true,purchase:updated});
}
