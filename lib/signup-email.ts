import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { pendingSignups, users } from "@/db/schema";
import { absoluteUrl } from "@/lib/api";
import { emailDeliveryConfigured, EmailNotConfiguredError, sendSignupAccountAccessEmail, sendSignupVerificationEmail } from "@/lib/email";
import { hashVerificationToken, makeVerificationToken, replacePendingSignup } from "@/lib/signup-verification";
import type { Database } from "@/db";

export class SignupVerificationDeliveryError extends Error {
  constructor() {
    super("Signup verification email could not be sent.");
    this.name = "SignupVerificationDeliveryError";
  }
}

type SignupVerificationOptions = {
  returnToApp?: boolean;
  /** Test seam for database-backed delivery and cleanup behavior. */
  db?: Database;
  sendEmail?: typeof sendSignupVerificationEmail;
  sendAccountAccessEmail?: typeof sendSignupAccountAccessEmail;
};

/** Send or rotate a signup link while keeping the response independent of account existence. */
export async function requestSignupVerification(request: Request, email: string, options: SignupVerificationOptions = {}) {
  if (!emailDeliveryConfigured()) throw new EmailNotConfiguredError();
  const db = options.db ?? await getDb();
  const [account] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (account) {
    try {
      const nonce = hashVerificationToken(makeVerificationToken());
      await (options.sendAccountAccessEmail ?? sendSignupAccountAccessEmail)(
        email,
        absoluteUrl(request, "/login"),
        absoluteUrl(request, "/forgot-password"),
        `signup-account-access/${nonce}`,
      );
    } catch (error) {
      console.error("Signup account-access email delivery failed", error instanceof Error ? error.message : "unknown error");
      throw new SignupVerificationDeliveryError();
    }
    return;
  }

  const token = makeVerificationToken();
  const tokenHash = hashVerificationToken(token);
  await replacePendingSignup(db, email, tokenHash);
  const query = new URLSearchParams({ token });
  if (options.returnToApp) query.set("returnToApp", "1");
  const verifyUrl = absoluteUrl(request, `/verify-email?${query.toString()}`);
  try {
    await (options.sendEmail ?? sendSignupVerificationEmail)(email, verifyUrl, `signup-verification/${tokenHash}`);
  } catch (error) {
    await db.delete(pendingSignups).where(eq(pendingSignups.tokenHash, tokenHash));
    console.error("Signup verification delivery failed", error instanceof Error ? error.message : "unknown error");
    throw new SignupVerificationDeliveryError();
  }
}
