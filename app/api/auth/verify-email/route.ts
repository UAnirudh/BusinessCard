import { clientIp, fail, isSameOrigin, ok, parseBody, rateLimit } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth";
import { getDb } from "@/db";
import { completeSignupVerification, hashVerificationToken } from "@/lib/signup-verification";
import { emailVerificationSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);
  const parsed = await parseBody(request, emailVerificationSchema);
  if (parsed.error) return parsed.error;
  const { token, name, password, acceptedTerms } = parsed.data;
  const tokenHash = hashVerificationToken(token);

  if (!(await rateLimit(`verify-email:ip:${clientIp(request)}`, 15, 15 * 60 * 1000)) ||
      !(await rateLimit(`verify-email:token:${tokenHash}`, 8, 60 * 60 * 1000))) {
    return fail("Too many attempts. Try again later.", 429);
  }

  const result = await completeSignupVerification(await getDb(), { token, name, password, acceptedTerms });
  if (result.status === "invalid") return fail("This verification link is invalid or expired. Request a new one.", 400);
  if (result.status === "taken") return fail("This email already has an account. Sign in instead.", 409);

  await setSessionCookie(result.session.token, result.session.expiresAt);
  return ok(
    {
      ok: true,
      slug: result.card.slug,
      user: { id: result.account.id, name: result.account.name, email: result.account.email },
      card: result.card,
    },
    201,
    { "cache-control": "no-store" },
  );
}
