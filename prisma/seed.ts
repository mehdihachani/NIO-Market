import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth';
import { normalizeEmail } from '../lib/security';
const db = new PrismaClient();
async function main() {
  const email = normalizeEmail(process.env.SEED_OWNER_EMAIL);
  const password = String(process.env.SEED_OWNER_PASSWORD || '');
  const name = String(process.env.SEED_OWNER_NAME || 'NIO Market Owner').trim();
  if (!email || !email.includes('@') || password.length < 12) throw new Error('Set SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD (12+ chars) before running db:seed.');
  const exists = await db.user.findUnique({ where:{email} });
  if (exists) { console.log('Owner already exists.'); return; }
  const owner = await db.user.create({ data:{ email, name, passwordHash:hashPassword(password), role:'OWNER' } });
  console.log(`Created owner ${owner.email}.`);
}
main().catch(e=>{ console.error(e); process.exit(1); }).finally(()=>db.$disconnect());
