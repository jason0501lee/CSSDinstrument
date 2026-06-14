import { prisma } from "@/lib/prisma";
import { nextSerial } from "@/lib/serial";
import { purchaseBatchSchema } from "@/lib/validation";
import { ok, fail, handleError, requireCapability } from "@/lib/api";
import type { Prisma } from "@prisma/client";

type Ctx = { params: Promise<{ code: string }> };

// POST /api/instruments/[code]/batches — 新增進貨批次
// 自動累加品項總庫存 + 產生 PURCHASE 交易序號 + 寫稽核。
export async function POST(req: Request, { params }: Ctx) {
  try {
    const operator = await requireCapability("instrument:write");
    const { code } = await params;
    const body = purchaseBatchSchema.parse(await req.json());

    const inst = await prisma.instrument.findUnique({ where: { code } });
    if (!inst) return fail("查無此器械編號", 404);
    if (inst.status === "ARCHIVED")
      return fail("器械已封存，無法進貨", 409);

    const amount = Math.round(body.quantity * body.unitPrice * 100) / 100;

    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.purchaseBatch.create({
        data: {
          instrumentCode: code,
          orderNo: body.orderNo ?? null,
          vendor: body.vendor ?? null,
          partNo: body.partNo ?? null,
          quantity: body.quantity,
          unitPrice: body.unitPrice,
          amount,
          lotNo: body.lotNo ?? null,
          expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
          receivedDate: new Date(body.receivedDate),
          note: body.note ?? null,
        },
      });

      const afterQty = inst.quantity + body.quantity;
      await tx.instrument.update({
        where: { code },
        data: { quantity: afterQty },
      });

      const serial = await nextSerial(tx);
      const transaction = await tx.transaction.create({
        data: {
          serial,
          type: "PURCHASE",
          instrumentCode: code,
          batchId: batch.id,
          quantityChange: body.quantity,
          beforeQty: inst.quantity,
          afterQty,
          reason: "進貨入庫",
          note:
            `${body.orderNo ? `單號 ${body.orderNo} · ` : ""}` +
            `單價 ${body.unitPrice}${body.lotNo ? ` · LOT ${body.lotNo}` : ""}`,
          operatorId: operator.id,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "PURCHASE_BATCH_CREATE",
          entity: "PurchaseBatch",
          entityId: batch.id,
          after: batch as unknown as Prisma.InputJsonValue,
          operatorId: operator.id,
          operatorName: operator.displayName,
        },
      });

      return { batch, transaction };
    });

    return ok(result, 201);
  } catch (err) {
    return handleError(err);
  }
}
