import { prisma } from "@/lib/prisma";
import { nextSerial } from "@/lib/serial";
import { ok, fail, handleError, requireCapability } from "@/lib/api";
import type { Prisma } from "@prisma/client";

type Ctx = { params: Promise<{ code: string }> };

// POST /api/instruments/[code]/archive — 封存器械（痛點1）
// 一鍵完成：歸零庫存 → 標記 ARCHIVED → 產生交易序號 → 保留歷史紀錄可查。
// 取代舊流程「手動歸零 + 改品名*** + 等三天自動刪除」。
export async function POST(_req: Request, { params }: Ctx) {
  try {
    const operator = await requireCapability("instrument:write");
    const { code } = await params;

    const before = await prisma.instrument.findUnique({ where: { code } });
    if (!before) return fail("查無此器械編號", 404);
    if (before.status === "ARCHIVED")
      return fail("此器械已封存", 409);

    // 若仍在盤包標準清單中，先擋下，避免清單指向已封存器械
    const inPack = await prisma.packItem.count({ where: { instrumentCode: code } });
    if (inPack > 0)
      return fail(
        `此器械仍存在於 ${inPack} 個盤包標準清單中，請先自盤包移除再封存`,
        409
      );

    const result = await prisma.$transaction(async (tx) => {
      const archived = await tx.instrument.update({
        where: { code },
        data: {
          quantity: 0,
          status: "ARCHIVED",
          archivedAt: new Date(),
        },
      });

      const serial = await nextSerial(tx);
      const transaction = await tx.transaction.create({
        data: {
          serial,
          type: "ARCHIVE",
          instrumentCode: code,
          quantityChange: -before.quantity,
          beforeQty: before.quantity,
          afterQty: 0,
          reason: "封存器械",
          note: `封存前庫存 ${before.quantity}`,
          operatorId: operator.id,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "INSTRUMENT_ARCHIVE",
          entity: "Instrument",
          entityId: code,
          before: before as unknown as Prisma.InputJsonValue,
          after: archived as unknown as Prisma.InputJsonValue,
          operatorId: operator.id,
          operatorName: operator.displayName,
        },
      });

      return { instrument: archived, transaction };
    });

    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
