import { randomBytes } from 'node:crypto';
export function generateTemporaryPassword(length=14){
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes=randomBytes(length); let out=''; for(const b of bytes) out+=alphabet[b%alphabet.length]; return out;
}
