import { clearSession } from "@/lib/auth";
import { ok, handleError } from "@/lib/api";

export async function POST() {
  try {
    await clearSession();
    return ok({ loggedOut: true });
  } catch (err) {
    return handleError(err);
  }
}
