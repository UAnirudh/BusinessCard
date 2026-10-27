import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { pendingSignups, users } from "@/db/schema";
import { absoluteUrl } from "@/lib/api";
import { emailDeliveryConfigured, EmailNotConfiguredError, sendSignupVerificationEmail } from "@/lib/email";
import { hashVerificationToken, makeVerificationToken, replacePendingSignup } from "@/lib/signup-verification";

/** Send or rotate a signup link while keeping the response independent of account existence. */
export async function requestSignupVerification(request: Request, email: string) {
  if (!emailDeliveryConfigured()) throw new EmailNotConfiguredError();
  const db = await getDb();
  const [account] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (account) return;

  const token = makeVerificationToken();
  const tokenHash = hashVerificationToken(token);
  await replacePendingSignup(db, email, tokenHash);
  const verifyUrl = absoluteUrl(request, `/verify-email?token=${encodeURIComponent(token)}`);
  try {
    await sendSignupVerificationEmail(email, verifyUrl, `signup-verification/${tokenHash}`);
  } catch (error) {
    await db.delete(pendingSignups).where(eq(pendingSignups.tokenHash, tokenHash));
    console.error("Signup verification delivery failed", error instanceof Error ? error.message : "unknown error");
  }
}
