import { getDb } from "@/db";
import { fail, isSameOrigin, ok, parseBody } from "@/lib/api";
import { consumePasswordReset } from "@/lib/password-reset";
import { passwordResetConfirmSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);
  const parsed = await parseBody(request, passwordResetConfirmSchema);
  if (parsed.error) return parsed.error;

  const db = await getDb();
  const reset = await consumePasswordReset(db, parsed.data.token, parsed.data.password);
  if (!reset) return fail("This reset link is invalid or expired. Request a new one to continue.", 400);
  return ok({ ok: true, message: "Your password has been updated. Sign in with your new password." }, 200, { "cache-control": "no-store" });
}
