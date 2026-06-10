import { prisma } from "@/lib/prisma";
import { packSchema } from "@/lib/validation";
import { ok, fail, handleError, requireUser, requireCapability } from "@/lib/api";
import type { Prisma } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/packs/[id] — 盤包內容查詢
export async function GET(_req: Request, { params }: Ctx) {
  try {
    await requireUser();
    const { id } = await params;
    const pack = await prisma.pack.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            instrument: {
              select: { code: true, name: true, quantity: true, status: true },
            },
          },
        },
      },
    });
    if (!pack) return fail("查無此盤包", 404);
    return ok(pack);
  } catch (err) {
    return handleError(err);
  }
}

// PATCH /api/packs/[id] — 維護盤包標準清單（重設整份清單）
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const operator = await requireCapability("pack:write");
    const { id } = await params;
    const body = packSchema.partial({ code: true }).parse(await req.json());

    const before = await prisma.pack.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!before) return fail("查無此盤包", 404);

    const items = body.items ?? [];
    if (items.length > 0) {
      const codes = items.map((i) => i.instrumentCode);
      const found = await prisma.instrument.findMany({
        where: { code: { in: codes } },
        select: { code: true, status: true },
      });
      const foundMap = new Map(found.map((f) => [f.code, f.status]));
      for (const c of codes) {
        if (!foundMap.has(c)) return fail(`清單器械 ${c} 不存在`, 422);
        if (foundMap.get(c) === "ARCHIVED")
          return fail(`清單器械 ${c} 已封存，不可加入盤包`, 422);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.packItem.deleteMany({ where: { packId: id } });
      const pack = await tx.pack.update({
        where: { id },
        data: {
          name: body.name ?? before.name,
          description: body.description ?? before.description,
          items: {
            create: items.map((i) => ({
              instrumentCode: i.instrumentCode,
              standardQty: i.standardQty,
            })),
          },
        },
        include: { items: true },
      });

      await tx.auditLog.create({
        data: {
          action: "PACK_UPDATE",
          entity: "Pack",
          entityId: id,
          before: before as unknown as Prisma.InputJsonValue,
          after: pack as unknown as Prisma.InputJsonValue,
          operatorId: operator.id,
          operatorName: operator.displayName,
        },
      });

      return pack;
    });

    return ok(updated);
  } catch (err) {
    return handleError(err);
  }
}
