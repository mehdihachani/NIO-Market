import { NextResponse } from 'next/server';
import { currentUser, hashPassword, verifyPassword } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({error:'غير مصرح'},{status:401});
  const body = await req.json().catch(()=>({}));
  const current = String(body.currentPassword||'');
  const next = String(body.newPassword||'');
  if (next.length < 12) return NextResponse.json({error:'كلمة المرور الجديدة يجب أن تكون 12 حرفًا على الأقل.'},{status:400});
  if (!verifyPassword(current,user.passwordHash)) return NextResponse.json({error:'كلمة المرور الحالية غير صحيحة.'},{status:400});
  await db.user.update({where:{id:user.id},data:{passwordHash:hashPassword(next),sessionVersion:{increment:1}}});
  await audit({userId:user.id,action:'PASSWORD_CHANGED',entity:'User',entityId:user.id});
  return NextResponse.json({ok:true,message:'تم تغيير كلمة المرور. سجّل الدخول من جديد.'});
}
