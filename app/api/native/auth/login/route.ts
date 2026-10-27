import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { createSession, verifyPassword } from "@/lib/auth";
import { ensureCard } from "@/lib/cards";
import { clientIp, fail, isSameOrigin, ok, parseBody, rateLimit } from "@/lib/api";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);
  const parsed = await parseBody(request, loginSchema);
  if (parsed.error) return parsed.error;
  const { email, password } = parsed.data;

  if (!(await rateLimit(`login:${clientIp(request)}:${email}`, 10, 10 * 60 * 1000))) {
    return fail("Too many attempts. Wait a few minutes and try again.", 429);
  }

  const db = await getDb();
  const [account] = await db
    .select({ id: users.id, name: users.name, email: users.email, passwordHash: users.passwordHash })
    .from(users)
    .where(and(eq(users.email, email), isNull(users.suspendedAt)))
    .limit(1);

  if (!account || !verifyPassword(password, account.passwordHash)) {
    return fail("That email and password don’t match.", 401);
  }

  const session = await createSession(account.id, { setCookie: false });
  const card = await ensureCard(account);
  return ok(
    {
      ok: true,
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
      user: { id: account.id, name: account.name, email: account.email },
      card,
    },
    200,
    { "cache-control": "no-store" },
  );
}
