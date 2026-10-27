import crypto from "node:crypto";
import { and, eq, gt, ne } from "drizzle-orm";
import type { Database } from "@/db";
import { accountEmailChangeTokens, cards, users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth";

export function verifyAccountEmailChangePassword(password: string, passwordHash: string): boolean {
  return verifyPassword(password, passwordHash);
}

function hasUniqueConstraintError(error: unknown): boolean {
  if (error && typeof error === "object") {
    if ("code" in error && error.code === "23505") return true;
    if ("cause" in error) return hasUniqueConstraintError(error.cause);
  }
  return false;
}

/** Atomically consumes a live token and changes the login/public-card email. */
export async function consumeAccountEmailChange(db: Database, token: string): Promise<"confirmed" | "invalid" | "taken"> {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const now = new Date();
  try {
    return await db.transaction(async (tx) => {
      // Deleting and returning the token is the single-use claim. Since it is
      // inside the same transaction as both email updates, failures roll back.
      const [claimed] = await tx
        .delete(accountEmailChangeTokens)
        .where(and(eq(accountEmailChangeTokens.id, tokenHash), gt(accountEmailChangeTokens.expiresAt, now)))
        .returning({ userId: accountEmailChangeTokens.userId, email: accountEmailChangeTokens.pendingEmail });
      if (!claimed) return "invalid";

      const [taken] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, claimed.email), ne(users.id, claimed.userId)))
        .limit(1);
      if (taken) return "taken";

      await tx.update(users).set({ email: claimed.email }).where(eq(users.id, claimed.userId));
      await tx.update(cards).set({ email: claimed.email, updatedAt: now }).where(eq(cards.userId, claimed.userId));
      await tx.delete(accountEmailChangeTokens).where(eq(accountEmailChangeTokens.userId, claimed.userId));
      return "confirmed";
    });
  } catch (error) {
    // If a different account claims this address between the preflight query
    // and the update, the unique index wins; discard the token and report it.
    if (!hasUniqueConstraintError(error)) throw error;
    await db.delete(accountEmailChangeTokens).where(eq(accountEmailChangeTokens.id, tokenHash));
    return "taken";
  }
}
