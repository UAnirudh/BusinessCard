import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { cards, users } from "@/db/schema";
import { createSession, hashPassword } from "@/lib/auth";
import { clientIp, fail, ok, parseBody, rateLimit } from "@/lib/api";
import { generateUniqueSlug } from "@/lib/cards";
import { signupSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await rateLimit(`signup:${clientIp(request)}`, 12, 10 * 60 * 1000))) {
    return fail("Too many attempts. Try again in a few minutes.", 429);
  }

  const parsed = await parseBody(request, signupSchema);
  if (parsed.error) return parsed.error;
  const { name, email, password } = parsed.data;

  const db = await getDb();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return fail("An account with that email already exists. Try logging in.", 409, { field: "email" });
  }

  const slug = await generateUniqueSlug(email.split("@")[0].replace(/[._-]+/g, " ") || name);
  const [user] = await db
    .insert(users)
    .values({ email, name, passwordHash: hashPassword(password) })
    .returning({ id: users.id, name: users.name });

  await db.insert(cards).values({
    userId: user.id,
    slug,
    displayName: name,
    email,
    accent: "lime",
  });

  await createSession(user.id);
  return ok({ ok: true, slug });
}
