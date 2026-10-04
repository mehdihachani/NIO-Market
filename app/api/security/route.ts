import { NextResponse } from 'next/server';
export async function GET() { return NextResponse.json({ ok:true, service:'nio-market', version:'1.0.0', timestamp:new Date().toISOString() }); }
