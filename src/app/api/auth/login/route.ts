import { prisma } from "@/lib/prisma";
import { verifyPassword, setSession, toSafeUser } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { ok, fail, handleError } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const body = loginSchema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { username: body.username },
    });
    if (!user || !user.active || !verifyPassword(body.password, user.passwordHash)) {
      return fail("帳號或密碼錯誤", 401);
    }
    await setSession(user.id);
    return ok(toSafeUser(user));
  } catch (err) {
    return handleError(err);
  }
}
