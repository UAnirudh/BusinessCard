import { getCurrentUser } from "@/lib/auth";
import { ensureCard } from "@/lib/cards";
import { fail, ok } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return fail("Sign in first", 401);

  const card = await ensureCard(user);
  return ok(
    { user, card },
    200,
    { "cache-control": "private, no-store" },
  );
}
