import { eq, ne, and } from "drizzle-orm";
import { getDb } from "@/db";
import { cards, sessions, users } from "@/db/schema";
import {
  currentSessionId,
  destroySession,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { fail, isSameOrigin, ok, parseBody } from "@/lib/api";
import { accountUpdateSchema } from "@/lib/validation";

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

  if (input.email && input.email !== account.email) {
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, input.email), ne(users.id, user.id)))
      .limit(1);
    if (taken) return fail("That email is already used by another account.", 409, { field: "email" });
    updates.email = input.email;
  }

  if (input.newPassword) {
    if (!input.currentPassword) return fail("Enter your current password to set a new one.", 422, { field: "currentPassword" });
    if (!verifyPassword(input.currentPassword, account.passwordHash)) {
      return fail("Your current password is incorrect.", 401, { field: "currentPassword" });
    }
    updates.passwordHash = hashPassword(input.newPassword);
  }

  if (Object.keys(updates).length === 0) return ok({ ok: true, unchanged: true });

  await db.update(users).set(updates).where(eq(users.id, user.id));
  if (updates.email) {
    // Keep the public card's contact email in sync with the account email.
    await db
      .update(cards)
      .set({ email: String(updates.email), updatedAt: new Date() })
      .where(eq(cards.userId, user.id));
  }
  if (updates.passwordHash) {
    // Keep the current session, drop every other device.
    const keep = await currentSessionId(request);
    await db
      .delete(sessions)
      .where(keep ? and(eq(sessions.userId, user.id), ne(sessions.id, keep)) : eq(sessions.userId, user.id));
  }
  return ok({ ok: true });
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

  await db.delete(users).where(eq(users.id, user.id));
  await destroySession(request);
  return ok({ ok: true, deleted: true });
}
