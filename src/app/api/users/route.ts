import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { createUserSchema } from "@/lib/validation";
import { ok, fail, handleError, requireCapability } from "@/lib/api";

// GET /api/users — 用戶清單（管理員）
export async function GET() {
  try {
    await requireCapability("user:manage");
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });
    return ok(users);
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/users — 用戶資料維護：新增帳號 + 設定權限（管理員）
export async function POST(req: Request) {
  try {
    const operator = await requireCapability("user:manage");
    const body = createUserSchema.parse(await req.json());

    const exists = await prisma.user.findUnique({
      where: { username: body.username },
    });
    if (exists) return fail(`帳號 ${body.username} 已存在`, 409);

    const user = await prisma.user.create({
      data: {
        username: body.username,
        displayName: body.displayName,
        passwordHash: hashPassword(body.password),
        role: body.role,
      },
      select: { id: true, username: true, displayName: true, role: true, active: true },
    });

    await prisma.auditLog.create({
      data: {
        action: "USER_CREATE",
        entity: "User",
        entityId: user.id,
        after: { username: user.username, role: user.role },
        operatorId: operator.id,
        operatorName: operator.displayName,
      },
    });

    return ok(user, 201);
  } catch (err) {
    return handleError(err);
  }
}
