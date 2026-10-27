import { getDb } from "@/db";
import { fail, isSameOrigin, ok, parseBody } from "@/lib/api";
import { consumeAccountEmailChange } from "@/lib/account-email-change";
import { accountEmailChangeConfirmSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);
  const parsed = await parseBody(request, accountEmailChangeConfirmSchema);
  if (parsed.error) return parsed.error;

  const result = await consumeAccountEmailChange(await getDb(), parsed.data.token);
  if (result === "invalid") return fail("This confirmation link is invalid or expired. Request a new one to continue.", 400, { code: "invalid_token" });
  if (result === "taken") return fail("That email is now used by another account. Request a new confirmation with a different address.", 409, { code: "email_taken" });
  return ok({ ok: true, message: "Your sign-in email has been updated." }, 200, { "cache-control": "no-store" });
}
