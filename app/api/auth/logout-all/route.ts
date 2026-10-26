import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions } from "@/db/schema";
import { getCurrentUser, SESSION_COOKIE } from "@/lib/auth";
import { fail, isSameOrigin, ok } from "@/lib/api";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);
  const user = await getCurrentUser(request);
  if (!user) return fail("Sign in first", 401);

  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.userId, user.id));
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return ok({ ok: true });
}
