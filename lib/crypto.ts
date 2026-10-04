import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function key() {
  const raw = process.env.APP_ENCRYPTION_KEY || '';
  if (!raw) throw new Error('APP_ENCRYPTION_KEY is required');
  const normalized = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : createHash('sha256').update(raw).digest();
  if (normalized.length !== 32) throw new Error('APP_ENCRYPTION_KEY must resolve to 32 bytes');
  return normalized;
}

export function encryptSecret(value: string | null | undefined) {
  if (!value) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`;
}

export function decryptSecret(value: string | null | undefined) {
  if (!value) return null;
  const [ivRaw, tagRaw, cipherRaw] = value.split('.');
  if (!ivRaw || !tagRaw || !cipherRaw) throw new Error('Invalid encrypted secret');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivRaw, 'base64'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(cipherRaw, 'base64')), decipher.final()]).toString('utf8');
}
