import { eq, ne, and } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";
import { deleteAccountAndSharedCardData } from "@/lib/account-deletion";
import {
  currentSessionId,
  destroySession,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { fail, isSameOrigin, ok, parseBody } from "@/lib/api";
import { accountUpdateSchema } from "@/lib/validation";
import { CURRENT_TERMS_VERSION } from "@/lib/terms";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);
  const user = await getCurrentUser(request);
  if (!user) return fail("Sign in first", 401);

  const parsed = await parseBody(request, accountUpdateSchema);
  if (parsed.error) return parsed.error;
  const input = parsed.data;

  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const account = rows[0];
  if (!account) return fail("Account not found", 404);

  const updates: Record<string, unknown> = {};

  if (input.name && input.name !== account.name) updates.name = input.name;
  if (input.acceptTerms && (!account.termsAcceptedAt || account.termsVersion !== CURRENT_TERMS_VERSION)) {
    updates.termsAcceptedAt = new Date();
    updates.termsVersion = CURRENT_TERMS_VERSION;
  }

  if (input.newPassword) {
    if (!input.currentPassword) return fail("Enter your current password to set a new one.", 422, { field: "currentPassword" });
    if (!verifyPassword(input.currentPassword, account.passwordHash)) {
      return fail("Your current password is incorrect.", 401, { field: "currentPassword" });
    }
    updates.passwordHash = hashPassword(input.newPassword);
  }

  if (Object.keys(updates).length === 0) {
    return ok({
      ok: true,
      unchanged: true,
      termsAcceptedAt: account.termsAcceptedAt?.toISOString() ?? null,
      termsVersion: account.termsVersion,
    });
  }

  await db.update(users).set(updates).where(eq(users.id, user.id));
  if (updates.passwordHash) {
    // Keep the current session, drop every other device.
    const keep = await currentSessionId(request);
    await db
      .delete(sessions)
      .where(keep ? and(eq(sessions.userId, user.id), ne(sessions.id, keep)) : eq(sessions.userId, user.id));
  }
  return ok({
    ok: true,
    termsAcceptedAt: (updates.termsAcceptedAt as Date | undefined)?.toISOString() ?? account.termsAcceptedAt?.toISOString() ?? null,
    termsVersion: (updates.termsVersion as string | undefined) ?? account.termsVersion,
  });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);
  const user = await getCurrentUser(request);
  if (!user) return fail("Sign in first", 401);

  const parsed = await parseBody(request, accountUpdateSchema);
  if (parsed.error) return parsed.error;
  if (!parsed.data.agreedToDelete) return fail("Confirm that you want to delete your account.", 422);

  const db = await getDb();
  const rows = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
  const account = rows[0];
  if (!account) return fail("Account not found", 404);

  if (!parsed.data.currentPassword) return fail("Enter your password to delete your account.", 422);
  if (!verifyPassword(parsed.data.currentPassword, account.passwordHash)) {
    return fail("That password is incorrect.", 401);
  }

  await deleteAccountAndSharedCardData(db, user.id);
  await destroySession(request);
  return ok({ ok: true, deleted: true });
}
