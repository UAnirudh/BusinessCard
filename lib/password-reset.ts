import crypto from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { Database } from "@/db";
import { passwordResetTokens, sessions, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";

/** Atomically consumes a live reset token, changes the password, and revokes every session. */
export async function consumePasswordReset(db: Database, token: string, password: string): Promise<boolean> {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const now = new Date();
  const userId = await db.transaction(async (tx) => {
    // The conditional delete is the single-use claim. Concurrent submissions
    // serialize on this row, and only one can receive the user id.
    const [claimed] = await tx
      .delete(passwordResetTokens)
      .where(and(eq(passwordResetTokens.id, tokenHash), gt(passwordResetTokens.expiresAt, now)))
      .returning({ userId: passwordResetTokens.userId });
    if (!claimed) return null;

    await tx.update(users).set({ passwordHash: hashPassword(password) }).where(eq(users.id, claimed.userId));
    await tx.delete(sessions).where(eq(sessions.userId, claimed.userId));
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, claimed.userId));
    return claimed.userId;
  });
  return Boolean(userId);
}
