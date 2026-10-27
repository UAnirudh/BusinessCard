import { fail, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { walletAvailability } from "@/lib/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return fail("Sign in first", 401);

  return ok(
    { walletAvailability: walletAvailability() },
    200,
    { "cache-control": "private, no-store" },
  );
}
