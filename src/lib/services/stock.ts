import { prisma } from "../prisma";
import { nextSerial } from "../serial";
import { HttpError } from "../api";
import type { TxType, User } from "@prisma/client";

type StockChangeParams = {
  instrumentCode: string;
  delta: number; // 正=增加, 負=減損
  type: TxType;
  reason?: string | null;
  note?: string | null;
  batchId?: string | null; // 報廢核賠：對應進貨批次
  operator: User;
  allowNegative?: boolean;
};

// 原子化執行庫存異動：更新庫存 + 產生交易序號 + 寫稽核日誌
export async function applyStockChange(params: StockChangeParams) {
  const { instrumentCode, delta, type, reason, note, batchId, operator } = params;

  return prisma.$transaction(async (tx) => {
    const inst = await tx.instrument.findUnique({
      where: { code: instrumentCode },
    });
    if (!inst) throw new HttpError("查無此器械編號", 404);
    if (inst.status === "ARCHIVED")
      throw new HttpError("器械已封存，無法異動庫存", 409);

    const afterQty = inst.quantity + delta;
    if (afterQty < 0 && !params.allowNegative)
      throw new HttpError(
        `庫存不足：現有 ${inst.quantity}，無法扣除 ${Math.abs(delta)}`,
        409
      );

    const updated = await tx.instrument.update({
      where: { code: instrumentCode },
      data: { quantity: afterQty },
    });

    const serial = await nextSerial(tx);
    const transaction = await tx.transaction.create({
      data: {
        serial,
        type,
        instrumentCode,
        batchId: batchId ?? null,
        quantityChange: delta,
        reason: reason ?? null,
        beforeQty: inst.quantity,
        afterQty,
        note: note ?? null,
        operatorId: operator.id,
      },
    });

    await tx.auditLog.create({
      data: {
        action: `STOCK_${type}`,
        entity: "Instrument",
        entityId: instrumentCode,
        before: { quantity: inst.quantity },
        after: { quantity: afterQty },
        operatorId: operator.id,
        operatorName: operator.displayName,
      },
    });

    return { instrument: updated, transaction };
  });
}
