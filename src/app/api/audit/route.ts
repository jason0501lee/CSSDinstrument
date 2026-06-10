import { prisma } from "@/lib/prisma";
import { ok, handleError, requireUser } from "@/lib/api";
import { can } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

// GET /api/audit — 稽核日誌
// 一般使用者只能看自己的（痛點3：操作人自助查閱）；管理員可加 ?scope=all 看全部。
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope");

    const where: Prisma.AuditLogWhereInput = {};
    if (scope === "all" && can(user.role, "audit:read:all")) {
      // 管理員看全部
    } else {
      where.operatorId = user.id;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    return ok(logs);
  } catch (err) {
    return handleError(err);
  }
}
