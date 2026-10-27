import crypto from "node:crypto";
import { and, eq, ne, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { accountEmailChangeTokens, users } from "@/db/schema";
import { clientIp, fail, isSameOrigin, ok, parseBody, rateLimit, absoluteUrl } from "@/lib/api";
import { sendAccountEmailChangeEmail, emailDeliveryConfigured, EmailNotConfiguredError } from "@/lib/email";
import { getCurrentUser, verifyPassword } from "@/lib/auth";
import { accountEmailChangeRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);
  const user = await getCurrentUser(request);
  if (!user) return fail("Sign in first", 401);

  const parsed = await parseBody(request, accountEmailChangeRequestSchema);
  if (parsed.error) return parsed.error;
  const { email, currentPassword } = parsed.data;

  if (!(await rateLimit(`account-email-change:user:${user.id}`, 5, 60 * 60 * 1000)) ||
      !(await rateLimit(`account-email-change:ip:${clientIp(request)}`, 20, 60 * 60 * 1000))) {
    return fail("Too many attempts. Wait a while before trying again.", 429);
  }

  const db = await getDb();
  const [account] = await db
    .select({ email: users.email, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (!account) return fail("Account not found", 404);
  if (!verifyPassword(currentPassword, account.passwordHash)) {
    return fail("Your current password is incorrect.", 401, { field: "currentPassword" });
  }
  if (email === account.email) return ok({ ok: true, message: "That is already your sign-in email." }, 200, { "cache-control": "no-store" });
  if (!emailDeliveryConfigured()) return fail("Email delivery is not configured for this service yet.", 503);

  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), ne(users.id, user.id)))
    .limit(1);
  if (taken) return fail("That email is already used by another account.", 409, { field: "email" });

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
  await db.delete(accountEmailChangeTokens).where(lte(accountEmailChangeTokens.expiresAt, now));
  await db.insert(accountEmailChangeTokens).values({ id: tokenHash, userId: user.id, pendingEmail: email, expiresAt })
    .onConflictDoUpdate({
      target: accountEmailChangeTokens.userId,
      set: { id: tokenHash, pendingEmail: email, expiresAt, createdAt: new Date() },
    });

  const confirmUrl = absoluteUrl(request, `/confirm-email?token=${encodeURIComponent(token)}`);
  try {
    await sendAccountEmailChangeEmail(email, confirmUrl, `account-email-change/${tokenHash}`);
  } catch (error) {
    await db.delete(accountEmailChangeTokens).where(eq(accountEmailChangeTokens.id, tokenHash));
    console.error("Account email change delivery failed", error instanceof Error ? error.message : "unknown error");
    return fail(error instanceof EmailNotConfiguredError ? "Email delivery is not configured for this service yet." : "We could not send the confirmation email. Try again.", 503);
  }

  return ok({ ok: true, message: `Confirmation instructions were sent to ${email}. Your sign-in email will change after you confirm.` }, 202, { "cache-control": "no-store" });
}
