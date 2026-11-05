import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { createSession, verifyPassword } from "@/lib/auth";
import { clientIp, fail, ok, parseBody, rateLimit } from "@/lib/api";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await parseBody(request, loginSchema);
  if (parsed.error) return parsed.error;
  const { email, password } = parsed.data;

  if (!(await rateLimit(`login:${clientIp(request)}:${email}`, 10, 10 * 60 * 1000))) {
    return fail("Too many attempts. Wait a few minutes and try again.", 429);
  }

  const db = await getDb();
  const rows = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(and(eq(users.email, email), isNull(users.suspendedAt)))
    .limit(1);

  const user = rows[0];
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return fail("That email and password don’t match.", 401);
  }

  await createSession(user.id);
  return ok({ ok: true });
}
