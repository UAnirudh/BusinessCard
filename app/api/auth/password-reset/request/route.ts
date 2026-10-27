import crypto from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { clientIp, fail, isSameOrigin, ok, parseBody, rateLimit, absoluteUrl } from "@/lib/api";
import { passwordResetEmailConfigured, sendPasswordResetEmail } from "@/lib/email";
import { passwordResetRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCEPTED = { ok: true, message: "If an account exists for that address, reset instructions will arrive shortly." };

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);
  const parsed = await parseBody(request, passwordResetRequestSchema);
  if (parsed.error) return parsed.error;

  const { email } = parsed.data;
  const ip = clientIp(request);
  if (!(await rateLimit(`password-reset:ip:${ip}`, 10, 60 * 60 * 1000)) ||
      !(await rateLimit(`password-reset:email:${email}`, 3, 60 * 60 * 1000))) {
    return fail("Too many requests. Wait a while before trying again.", 429);
  }
  if (!passwordResetEmailConfigured()) {
    return fail("Password recovery email is not configured for this service yet.", 503);
  }

  const db = await getDb();
  const [user] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.email, email)).limit(1);
  if (!user) return ok(ACCEPTED, 202, { "cache-control": "no-store" });

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await db.delete(passwordResetTokens).where(lt(passwordResetTokens.expiresAt, new Date()));
  await db.insert(passwordResetTokens).values({ id: tokenHash, userId: user.id, expiresAt });

  const resetUrl = absoluteUrl(request, `/reset-password?token=${encodeURIComponent(token)}`);
  try {
    await sendPasswordResetEmail(user.email, resetUrl, `password-reset/${tokenHash}`);
  } catch (error) {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, tokenHash));
    console.error("Password reset email delivery failed", error instanceof Error ? error.message : "unknown error");
    // Keep the response identical for known and unknown addresses.
  }
  return ok(ACCEPTED, 202, { "cache-control": "no-store" });
}
