import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { cards, users } from "@/db/schema";
import { createSession, hashPassword } from "@/lib/auth";
import { clientIp, fail, isSameOrigin, ok, parseBody, rateLimit } from "@/lib/api";
import { generateUniqueSlug } from "@/lib/cards";
import { signupSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);
  if (!(await rateLimit(`signup:${clientIp(request)}`, 12, 10 * 60 * 1000))) {
    return fail("Too many attempts. Try again in a few minutes.", 429);
  }

  const parsed = await parseBody(request, signupSchema);
  if (parsed.error) return parsed.error;
  const { name, email, password } = parsed.data;

  const db = await getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return fail("An account with that email already exists. Try logging in.", 409, { field: "email" });

  const slug = await generateUniqueSlug(email.split("@")[0].replace(/[._-]+/g, " ") || name);
  const [account] = await db
    .insert(users)
    .values({ email, name, passwordHash: hashPassword(password) })
    .returning({ id: users.id, name: users.name, email: users.email });
  const [card] = await db
    .insert(cards)
    .values({ userId: account.id, slug, displayName: name, email, accent: "lime" })
    .returning();
  const session = await createSession(account.id, { setCookie: false });

  return ok(
    {
      ok: true,
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
      user: { id: account.id, name: account.name, email: account.email },
      card,
    },
    201,
    { "cache-control": "no-store" },
  );
}
