import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

type AuditInput = {
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  operatorId?: string | null;
  operatorName?: string | null;
};

// 寫入稽核日誌（append-only）。可傳入 tx 以併入既有交易。
export async function writeAudit(
  input: AuditInput,
  client: Prisma.TransactionClient | typeof prisma = prisma
) {
  await client.auditLog.create({
    data: {
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      before: (input.before ?? undefined) as Prisma.InputJsonValue | undefined,
      after: (input.after ?? undefined) as Prisma.InputJsonValue | undefined,
      operatorId: input.operatorId ?? null,
      operatorName: input.operatorName ?? null,
    },
  });
}
