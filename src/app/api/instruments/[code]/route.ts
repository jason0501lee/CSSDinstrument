import { prisma } from "@/lib/prisma";
import { nextSerial } from "@/lib/serial";
import { updateInstrumentSchema } from "@/lib/validation";
import { ok, fail, handleError, requireUser, requireCapability } from "@/lib/api";
import type { Prisma } from "@prisma/client";

type Ctx = { params: Promise<{ code: string }> };

// GET /api/instruments/[code] — 單筆 + 近期交易
export async function GET(_req: Request, { params }: Ctx) {
  try {
    await requireUser();
    const { code } = await params;
    const inst = await prisma.instrument.findUnique({
      where: { code },
      include: {
        department: true,
        category: true,
        parent: { select: { code: true, name: true } },
        children: { select: { code: true, name: true, quantity: true } },
        batches: { orderBy: { receivedDate: "desc" } },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { operator: { select: { displayName: true } } },
        },
      },
    });
    if (!inst) return fail("查無此器械編號", 404);
    return ok(inst);
  } catch (err) {
    return handleError(err);
  }
}

// PATCH /api/instruments/[code] — 編輯已建檔資料
// 痛點2：不需先手動查交易序號，系統於修改時自動產生 EDIT 交易序號並記稽核。
// 注意：器械編號（含科別/類別命名規則）為主鍵，不可更改。
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const operator = await requireCapability("instrument:write");
    const { code } = await params;
    const body = updateInstrumentSchema.parse(await req.json());

    const before = await prisma.instrument.findUnique({ where: { code } });
    if (!before) return fail("查無此器械編號", 404);
    if (before.status === "ARCHIVED")
      return fail("器械已封存，無法編輯", 409);

    if (body.parentCode) {
      if (body.parentCode === code)
        return fail("子代碼不可指向自己", 422);
      const parent = await prisma.instrument.findUnique({
        where: { code: body.parentCode },
      });
      if (!parent) return fail(`子代碼指向的主代碼 ${body.parentCode} 不存在`, 422);
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.instrument.update({
        where: { code },
        data: {
          name: body.name,
          englishName: body.englishName,
          brand: body.brand,
          model: body.model,
          origin: body.origin,
          commonCode: body.commonCode,
          parentCode: body.parentCode,
          propertyNo: body.propertyNo,
          unit: body.unit,
          note: body.note,
        },
      });

      const serial = await nextSerial(tx);
      const transaction = await tx.transaction.create({
        data: {
          serial,
          type: "EDIT",
          instrumentCode: code,
          quantityChange: 0,
          beforeQty: before.quantity,
          afterQty: updated.quantity,
          note: "編輯器械資料",
          operatorId: operator.id,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "INSTRUMENT_UPDATE",
          entity: "Instrument",
          entityId: code,
          before: before as unknown as Prisma.InputJsonValue,
          after: updated as unknown as Prisma.InputJsonValue,
          operatorId: operator.id,
          operatorName: operator.displayName,
        },
      });

      return { instrument: updated, transaction };
    });

    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
