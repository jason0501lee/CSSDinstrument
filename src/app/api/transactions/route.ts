import { prisma } from "@/lib/prisma";
import { ok, handleError, requireUser } from "@/lib/api";
import type { Prisma } from "@prisma/client";

// GET /api/transactions — 器械交易查詢 / 交易明細查詢
// query: instrument, type, serial, from, to
export async function GET(req: Request) {
  try {
    await requireUser();
    const url = new URL(req.url);
    const instrument = url.searchParams.get("instrument")?.trim();
    const type = url.searchParams.get("type")?.trim();
    const serial = url.searchParams.get("serial")?.trim();
    const from = url.searchParams.get("from")?.trim();
    const to = url.searchParams.get("to")?.trim();

    const where: Prisma.TransactionWhereInput = {};
    if (instrument)
      where.instrumentCode = { contains: instrument, mode: "insensitive" };
    if (type) where.type = type as Prisma.TransactionWhereInput["type"];
    if (serial) where.serial = { contains: serial, mode: "insensitive" };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(`${to}T23:59:59`);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        operator: { select: { displayName: true } },
        instrument: { select: { name: true } },
        pack: { select: { code: true, name: true } },
      },
    });
    return ok(transactions);
  } catch (err) {
    return handleError(err);
  }
}
