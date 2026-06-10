import { prisma } from "@/lib/prisma";
import { packSchema } from "@/lib/validation";
import { ok, fail, handleError, requireUser, requireCapability } from "@/lib/api";
import type { Prisma } from "@prisma/client";

// GET /api/packs — 盤包清單
export async function GET() {
  try {
    await requireUser();
    const packs = await prisma.pack.findMany({
      orderBy: { code: "asc" },
      include: { _count: { select: { items: true } } },
    });
    return ok(packs);
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/packs — 器械盤包維護：建立盤包 + 標準清單
export async function POST(req: Request) {
  try {
    const operator = await requireCapability("pack:write");
    const body = packSchema.parse(await req.json());

    const exists = await prisma.pack.findUnique({ where: { code: body.code } });
    if (exists) return fail(`盤包代碼 ${body.code} 已存在`, 409);

    // 驗證清單內器械皆存在且未封存
    if (body.items.length > 0) {
      const codes = body.items.map((i) => i.instrumentCode);
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

    const pack = await prisma.$transaction(async (tx) => {
      const created = await tx.pack.create({
        data: {
          code: body.code,
          name: body.name,
          description: body.description ?? null,
          items: {
            create: body.items.map((i) => ({
              instrumentCode: i.instrumentCode,
              standardQty: i.standardQty,
            })),
          },
        },
        include: { items: true },
      });

      await tx.auditLog.create({
        data: {
          action: "PACK_CREATE",
          entity: "Pack",
          entityId: created.id,
          after: created as unknown as Prisma.InputJsonValue,
          operatorId: operator.id,
          operatorName: operator.displayName,
        },
      });

      return created;
    });

    return ok(pack, 201);
  } catch (err) {
    return handleError(err);
  }
}
