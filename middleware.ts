import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
const PLATFORM = new Set(['nio-market.com','www.nio-market.com','app.nio-market.com','localhost','127.0.0.1']);
function sessionRole(req: NextRequest){
 const token=req.cookies.get('nio_session')?.value; const secret=process.env.AUTH_SECRET||'';
 if(!token||secret.length<1)return null;
 const parts=token.split('.'); if(parts.length!==5)return null;
 const [userId,exp,version,role,sig]=parts; if(!userId||!exp||!version||!role||!sig||Number(exp)<Date.now())return null;
 const payload=`${userId}.${exp}.${version}.${role}`; const expected=createHmac('sha256',secret).update(payload).digest('hex');
 try{if(!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;}catch{return null}
 return role;
}
export function middleware(req: NextRequest) {
 const host=(req.headers.get('host')||'').split(':')[0].toLowerCase(); const pathname=req.nextUrl.pathname; const role=sessionRole(req);
 if(pathname==='/dashboard' || pathname.startsWith('/dashboard/')) { if(role==='OWNER'||role==='ADMIN') return NextResponse.redirect(new URL('/admin',req.url)); }
 if(pathname==='/admin' || pathname.startsWith('/admin/')) { if(role==='MERCHANT') return NextResponse.redirect(new URL('/dashboard',req.url)); }
 const isPlatform=PLATFORM.has(host)||host.endsWith('.nio-market.com')||host.endsWith('.localhost');
 if(!host||pathname.startsWith('/api')||pathname.startsWith('/admin')||pathname.startsWith('/dashboard')||pathname.startsWith('/login')||pathname.startsWith('/setup')||pathname.startsWith('/_next')||pathname.includes('.')) return NextResponse.next();
 const url=req.nextUrl.clone();
 if(isPlatform&&host.endsWith('.nio-market.com')&&host!=='www.nio-market.com'&&host!=='app.nio-market.com'){const slug=host.slice(0,-'.nio-market.com'.length);url.pathname=`/store/${encodeURIComponent(slug)}${pathname==='/'?'':pathname}`;}
 else if(isPlatform&&host.endsWith('.localhost')&&host!=='localhost'){const slug=host.slice(0,-'.localhost'.length);url.pathname=`/store/${encodeURIComponent(slug)}${pathname==='/'?'':pathname}`;}
 else if(!isPlatform){url.pathname=`/domain/${encodeURIComponent(host)}${pathname==='/'?'':pathname}`;}
 else return NextResponse.next();
 return NextResponse.rewrite(url);
}
export const config={matcher:['/((?!favicon.ico).*)']};
