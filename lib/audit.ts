import { db } from './db';
export async function audit(input: { userId?: string; action: string; entity: string; entityId?: string; metadata?: unknown; ipAddress?: string }) {
  try { await db.auditLog.create({ data: { userId: input.userId, action: input.action, entity: input.entity, entityId: input.entityId, metadata: input.metadata as any, ipAddress: input.ipAddress } }); } catch {}
}
