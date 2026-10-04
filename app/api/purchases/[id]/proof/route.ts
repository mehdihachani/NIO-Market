import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const u=await currentUser(); if(!u || (u.role!=='OWNER'&&u.role!=='ADMIN')) return NextResponse.json({error:'غير مصرح'},{status:403});
 const {id}=await params; const p=await db.paymentPurchase.findUnique({where:{id}}); if(!p?.proofPath) return NextResponse.json({error:'الإثبات غير موجود'},{status:404});
 const root=path.resolve(process.env.PAYMENT_PROOF_DIR || './private/payment-proofs'); const file=path.resolve(root,p.proofPath); if(!file.startsWith(root+path.sep)) return NextResponse.json({error:'ملف غير صالح'},{status:400});
 try{const data=await readFile(file);return new NextResponse(data,{headers:{'Content-Type':p.proofMimeType||'application/octet-stream','Content-Disposition':`inline; filename="${encodeURIComponent(p.proofOriginalName||'proof')}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}catch{return NextResponse.json({error:'الملف غير موجود على الخادم'},{status:404});}
}
