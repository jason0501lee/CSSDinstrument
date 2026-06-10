import { prisma } from "@/lib/prisma";
import { nextSerial } from "@/lib/serial";
import { assembleSchema } from "@/lib/validation";
import { ok, fail, handleError, requireCapability } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/packs/[id]/assemble — 盤包配包作業
// 依標準清單扣除各器械庫存，每筆器械產生一筆 PACK 交易序號。
export async function POST(req: Request, { params }: Ctx) {
  try {
    const operator = await requireCapability("pack:write");
    const { id } = await params;
    const body = assembleSchema.parse({ packId: id, ...(await req.json().catch(() => ({}))) });

    const pack = await prisma.pack.findUnique({
      where: { id },
      include: { items: { include: { instrument: true } } },
    });
    if (!pack) return fail("查無此盤包", 404);
    if (pack.items.length === 0) return fail("此盤包尚無標準清單，無法配包", 422);

    // 預檢庫存是否足夠
    const shortage = pack.items
      .filter((it) => it.instrument.quantity < it.standardQty)
      .map(
        (it) =>
          `${it.instrumentCode}（需 ${it.standardQty}、現有 ${it.instrument.quantity}）`
      );
    if (shortage.length > 0)
      return fail(`庫存不足，無法配包：${shortage.join("、")}`, 409);

    const result = await prisma.$transaction(async (tx) => {
      const records = [];
      for (const it of pack.items) {
        const beforeQty = it.instrument.quantity;
        const afterQty = beforeQty - it.standardQty;
        await tx.instrument.update({
          where: { code: it.instrumentCode },
          data: { quantity: afterQty },
        });
        const serial = await nextSerial(tx);
        const trx = await tx.transaction.create({
          data: {
            serial,
            type: "PACK",
            instrumentCode: it.instrumentCode,
            packId: id,
            quantityChange: -it.standardQty,
            beforeQty,
            afterQty,
            reason: "盤包配包",
            note: body.note ?? `配包：${pack.code} ${pack.name}`,
            operatorId: operator.id,
          },
        });
        records.push(trx);
      }

      await tx.auditLog.create({
        data: {
          action: "PACK_ASSEMBLE",
          entity: "Pack",
          entityId: id,
          after: { packCode: pack.code, itemCount: pack.items.length },
          operatorId: operator.id,
          operatorName: operator.displayName,
        },
      });

      return records;
    });

    return ok({ packId: id, transactions: result });
  } catch (err) {
    return handleError(err);
  }
}
