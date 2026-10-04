import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
export async function GET(){
  try { await db.$queryRaw`SELECT 1`; return NextResponse.json({ok:true,service:'nio-market'}); }
  catch { return NextResponse.json({ok:false,service:'nio-market'},{status:503}); }
}
