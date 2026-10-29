import crypto from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db";
import { cards, sessions, users, type Card, type User } from "@/db/schema";
import { hashPassword, verifyPassword } from "./password";

export { hashPassword, verifyPassword };

export const SESSION_COOKIE = "tappd_session";
const SESSION_DAYS = 30;
const BEARER_TOKEN_PATTERN = /^Bearer ([A-Za-z0-9_-]{43})$/i;

function sessionId(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Hashed id of the session cookie on this request, if any. */
function requestBearerToken(request?: Request): { present: boolean; token: string | null } {
  const authorization = request?.headers.get("authorization");
  if (!authorization) return { present: false, token: null };
  const match = BEARER_TOKEN_PATTERN.exec(authorization.trim());
  return { present: true, token: match?.[1] ?? null };
}

async function sessionToken(request?: Request): Promise<string | null> {
  const bearer = requestBearerToken(request);
  // An explicitly supplied but malformed bearer credential must not silently
  // fall back to a different ambient cookie credential.
  if (bearer.present) return bearer.token;
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function currentSessionId(request?: Request): Promise<string | null> {
  const token = await sessionToken(request);
  return token ? sessionId(token) : null;
}

export async function createSession(
  userId: string,
  options: { setCookie?: boolean } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const session = createSessionRecord(userId);
  const db = await getDb();
  await db.insert(sessions).values(session.row);

  if (options.setCookie !== false) {
    await setSessionCookie(session.token, session.expiresAt);
  }

  return { token: session.token, expiresAt: session.expiresAt };
}

/** Creates session credentials without persisting them, for atomic signup transactions. */
export function createSessionRecord(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  return { token, expiresAt, row: { id: sessionId(token), userId, expiresAt } };
}

/** Sets the browser session cookie after its database row has been persisted. */
export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(request?: Request): Promise<void> {
  const store = await cookies();
  const id = await currentSessionId(request);
  if (id) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.id, id));
  }
  store.delete(SESSION_COOKIE);
}

export type SessionUser = Pick<User, "id" | "email" | "name" | "createdAt" | "termsAcceptedAt" | "termsVersion">;

/** Resolves the signed-in user once per request. */
export const getCurrentUser = cache(async (request?: Request): Promise<SessionUser | null> => {
  const token = await sessionToken(request);
  if (!token) return null;

  const db = await getDb();
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
      termsAcceptedAt: users.termsAcceptedAt,
      termsVersion: users.termsVersion,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, sessionId(token)), gt(sessions.expiresAt, new Date()), isNull(users.suspendedAt)))
    .limit(1);

  return rows[0] ?? null;
});

export type Viewer = { user: SessionUser; card: Card };

/** The signed-in user plus their card, or null. */
export const getViewer = cache(async (request?: Request): Promise<Viewer | null> => {
  const user = await getCurrentUser(request);
  if (!user) return null;
  const db = await getDb();
  const rows = await db.select().from(cards).where(eq(cards.userId, user.id)).limit(1);
  const card = rows[0];
  if (!card) return null;
  return { user, card };
});
