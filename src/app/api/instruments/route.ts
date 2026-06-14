import { prisma } from "@/lib/prisma";
import { nextSerial } from "@/lib/serial";
import { createInstrumentSchema } from "@/lib/validation";
import {
  ok,
  fail,
  handleError,
  requireUser,
  requireCapability,
  HttpError,
} from "@/lib/api";
import type { Prisma } from "@prisma/client";

// GET /api/instruments — 列表 / 全文模糊搜尋（痛點6）
// query: q（品名/廠牌/編號/財產編號）, department, category, status, mode=total|detail
export async function GET(req: Request) {
  try {
    await requireUser();
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim();
    const department = url.searchParams.get("department")?.trim();
    const category = url.searchParams.get("category")?.trim();
    const status = url.searchParams.get("status")?.trim();

    const where: Prisma.InstrumentWhereInput = {};
    if (q) {
      where.OR = [
        { code: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { englishName: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { model: { contains: q, mode: "insensitive" } },
        { origin: { contains: q, mode: "insensitive" } },
        { propertyNo: { contains: q, mode: "insensitive" } },
        { commonCode: { contains: q, mode: "insensitive" } },
        // 進貨批次任一條件（訂購單號 / 廠商 / 料號 / LOT批號）
        {
          batches: {
            some: {
              OR: [
                { orderNo: { contains: q, mode: "insensitive" } },
                { vendor: { contains: q, mode: "insensitive" } },
                { partNo: { contains: q, mode: "insensitive" } },
                { lotNo: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        },
      ];
    }
    if (department) where.departmentCode = department;
    if (category) where.categoryCode = category;
    if (status) where.status = status as Prisma.InstrumentWhereInput["status"];
    else where.status = { not: "ARCHIVED" }; // 預設不顯示已封存

    const instruments = await prisma.instrument.findMany({
      where,
      orderBy: { code: "asc" },
      take: 500,
      include: {
        department: { select: { name: true } },
        category: { select: { name: true } },
      },
    });
    return ok(instruments);
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/instruments — 器械資料維護：新器械建檔
export async function POST(req: Request) {
  try {
    const operator = await requireCapability("instrument:write");
    const body = createInstrumentSchema.parse(await req.json());

    const departmentCode = body.code[0];
    const categoryCode = body.code[1];

    // 驗證科別/類別已建檔
    const [dept, cat, existing] = await Promise.all([
      prisma.department.findUnique({ where: { code: departmentCode } }),
      prisma.category.findUnique({ where: { code: categoryCode } }),
      prisma.instrument.findUnique({ where: { code: body.code } }),
    ]);
    if (existing) return fail(`器械編號 ${body.code} 已存在`, 409);
    if (!dept)
      return fail(`科別代碼 "${departmentCode}" 尚未建檔，請先於科別維護新增`, 422);
    if (!cat)
      return fail(`類別代碼 "${categoryCode}" 尚未建檔，請先於類別維護新增`, 422);

    if (body.parentCode) {
      const parent = await prisma.instrument.findUnique({
        where: { code: body.parentCode },
      });
      if (!parent) return fail(`子代碼指向的主代碼 ${body.parentCode} 不存在`, 422);
    }

    const result = await prisma.$transaction(async (tx) => {
      const inst = await tx.instrument.create({
        data: {
          code: body.code,
          name: body.name,
          englishName: body.englishName ?? null,
          brand: body.brand ?? null,
          model: body.model ?? null,
          origin: body.origin ?? null,
          departmentCode,
          categoryCode,
          commonCode: body.commonCode ?? null,
          parentCode: body.parentCode ?? null,
          propertyNo: body.propertyNo ?? null,
          unit: body.unit,
          quantity: body.initialQty,
          note: body.note ?? null,
        },
      });

      const serial = await nextSerial(tx);
      await tx.transaction.create({
        data: {
          serial,
          type: "REGISTER",
          instrumentCode: inst.code,
          quantityChange: body.initialQty,
          beforeQty: 0,
          afterQty: body.initialQty,
          note: "新器械建檔",
          operatorId: operator.id,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "INSTRUMENT_CREATE",
          entity: "Instrument",
          entityId: inst.code,
          after: inst as unknown as Prisma.InputJsonValue,
          operatorId: operator.id,
          operatorName: operator.displayName,
        },
      });

      return inst;
    });

    return ok(result, 201);
  } catch (err) {
    if (err instanceof HttpError) return handleError(err);
    return handleError(err);
  }
}
