import crypto from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db";
import { cards, sessions, users, type Card, type User } from "@/db/schema";
import { hashPassword, verifyPassword } from "./password";

export { hashPassword, verifyPassword };

export const SESSION_COOKIE = "tappd_session";
const SESSION_DAYS = 30;

function sessionId(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Hashed id of the session cookie on this request, if any. */
export async function currentSessionId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return token ? sessionId(token) : null;
}

export async function createSession(userId: string): Promise<void> {
  const db = await getDb();
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ id: sessionId(token), userId, expiresAt });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.id, sessionId(token)));
  }
  store.delete(SESSION_COOKIE);
}

export type SessionUser = Pick<User, "id" | "email" | "name" | "createdAt">;

/** Resolves the signed-in user once per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = await getDb();
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, sessionId(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return rows[0] ?? null;
});

export type Viewer = { user: SessionUser; card: Card };

/** The signed-in user plus their card, or null. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const db = await getDb();
  const rows = await db.select().from(cards).where(eq(cards.userId, user.id)).limit(1);
  const card = rows[0];
  if (!card) return null;
  return { user, card };
});
