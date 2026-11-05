import { getCurrentUser } from "@/lib/auth";
import { ensureCard } from "@/lib/cards";
import { fail, ok } from "@/lib/api";
import { CURRENT_TERMS_VERSION } from "@/lib/terms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return fail("Sign in first", 401);

  const card = await ensureCard(user);
  return ok(
    { user: { ...user, currentTermsVersion: CURRENT_TERMS_VERSION }, card },
    200,
    { "cache-control": "private, no-store" },
  );
}
