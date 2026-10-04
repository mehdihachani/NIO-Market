import { NextResponse } from 'next/server';
import { COOKIE } from '@/lib/auth';
export async function POST(req: Request) {
  const url = new URL('/login', req.url);
  const res = NextResponse.redirect(url);
  res.cookies.set(COOKIE, '', { httpOnly: true, expires: new Date(0), path: '/', sameSite: 'lax' });
  return res;
}
