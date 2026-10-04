import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const required=['prisma/schema.prisma','lib/auth.ts','lib/merchant.ts','app/api/orders/route.ts','app/api/orders/manage/route.ts','app/api/products/route.ts','app/api/auth/password/route.ts'];
const missing=required.filter(f=>!fs.existsSync(path.join(root,f)));
const schema=fs.readFileSync(path.join(root,'prisma/schema.prisma'),'utf8');
const checks=[
 ['merchant store unique',/merchantId String @unique/.test(schema)],
 ['user session version',/sessionVersion Int @default\(0\)/.test(schema)],
 ['password change invalidates sessions',/sessionVersion:\{increment:1\}/.test(fs.readFileSync(path.join(root,'app/api/auth/password/route.ts'),'utf8'))],
 ['checkout subscription gate',/isSubscriptionUsable/.test(fs.readFileSync(path.join(root,'app/api/orders/route.ts'),'utf8'))],
 ['product plan limit',/getPlanLimits/.test(fs.readFileSync(path.join(root,'app/api/products/route.ts'),'utf8'))],
 ['store subscription gate',/isSubscriptionUsable/.test(fs.readFileSync(path.join(root,'app/store/[slug]/page.tsx'),'utf8'))],
];
if(missing.length||checks.some(([,ok])=>!ok)){console.error(JSON.stringify({missing,failed:checks.filter(([,ok])=>!ok).map(([n])=>n)},null,2));process.exit(1)}
console.log('NIO architecture checks: PASS');
