import { getCurrentUser, toSafeUser } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/api";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("尚未登入", 401);
    return ok(toSafeUser(user));
  } catch (err) {
    return handleError(err);
  }
}
