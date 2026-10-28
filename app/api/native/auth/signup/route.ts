import { clientIp, fail, isSameOrigin, ok, parseBody, rateLimit } from "@/lib/api";
import { emailDeliveryConfigured, EmailNotConfiguredError } from "@/lib/email";
import { requestSignupVerification, SignupVerificationDeliveryError } from "@/lib/signup-email";
import { signupSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const verificationMessage = "If this email can be used for a new account, we’ll send a verification link shortly.";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);
  const parsed = await parseBody(request, signupSchema);
  if (parsed.error) return parsed.error;
  const { email } = parsed.data;

  if (!(await rateLimit(`signup:ip:${clientIp(request)}`, 12, 10 * 60 * 1000)) ||
      !(await rateLimit(`signup:email:${email}`, 4, 60 * 60 * 1000))) {
    return fail("Too many attempts. Try again in a few minutes.", 429);
  }

  if (!emailDeliveryConfigured()) {
    return fail("Email verification is temporarily unavailable. Try again later.", 503);
  }

  try {
    await requestSignupVerification(request, email, { returnToApp: true });
  } catch (error) {
    if (error instanceof EmailNotConfiguredError || error instanceof SignupVerificationDeliveryError) {
      return fail("Email verification is temporarily unavailable. Try again later.", 503);
    }
    throw error;
  }

  return ok({ ok: true, verificationRequired: true, email, message: verificationMessage }, 202, { "cache-control": "no-store" });
}
