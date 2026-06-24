import { prisma } from "@/lib/prisma";
import { ok, handleError, requireUser } from "@/lib/api";
import type { Prisma } from "@prisma/client";

// GET /api/purchases — 進貨/採購查詢報表（跨所有器械的進貨批次）
// query: q（器械/品名/廠商/單號/料號/LOT）, vendor, instrument, from, to
export async function GET(req: Request) {
  try {
    await requireUser();
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim();
    const vendor = url.searchParams.get("vendor")?.trim();
    const instrument = url.searchParams.get("instrument")?.trim();
    const from = url.searchParams.get("from")?.trim();
    const to = url.searchParams.get("to")?.trim();

    const where: Prisma.PurchaseBatchWhereInput = {};
    if (q) {
      where.OR = [
        { instrumentCode: { contains: q, mode: "insensitive" } },
        { vendor: { contains: q, mode: "insensitive" } },
        { orderNo: { contains: q, mode: "insensitive" } },
        { lotNo: { contains: q, mode: "insensitive" } },
        { partNo: { contains: q, mode: "insensitive" } },
        { instrument: { name: { contains: q, mode: "insensitive" } } },
      ];
    }
    if (vendor) where.vendor = { contains: vendor, mode: "insensitive" };
    if (instrument)
      where.instrumentCode = { contains: instrument, mode: "insensitive" };
    if (from || to) {
      where.receivedDate = {};
      if (from) where.receivedDate.gte = new Date(from);
      if (to) where.receivedDate.lte = new Date(`${to}T23:59:59`);
    }

    const [batches, agg] = await Promise.all([
      prisma.purchaseBatch.findMany({
        where,
        orderBy: { receivedDate: "desc" },
        take: 500,
        include: {
          instrument: { select: { code: true, name: true, unit: true } },
        },
      }),
      prisma.purchaseBatch.aggregate({
        where,
        _sum: { quantity: true, amount: true },
        _count: true,
      }),
    ]);

    return ok({
      batches,
      summary: {
        count: agg._count,
        totalQty: agg._sum.quantity ?? 0,
        totalAmount: agg._sum.amount ?? 0,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
