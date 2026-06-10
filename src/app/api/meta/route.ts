import { prisma } from "@/lib/prisma";
import { ok, handleError, requireUser } from "@/lib/api";

// 表單下拉用：科別 + 類別清單
export async function GET() {
  try {
    await requireUser();
    const [departments, categories] = await Promise.all([
      prisma.department.findMany({ orderBy: { code: "asc" } }),
      prisma.category.findMany({ orderBy: { code: "asc" } }),
    ]);
    return ok({ departments, categories });
  } catch (err) {
    return handleError(err);
  }
}
