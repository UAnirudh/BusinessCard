import { destroySession } from "@/lib/auth";
import { isSameOrigin, fail, ok } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);
  await destroySession();
  return ok({ ok: true });
}
