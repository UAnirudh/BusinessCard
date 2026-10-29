import crypto from "node:crypto";
import { and, eq, gt, lte } from "drizzle-orm";
import type { Database } from "@/db";
import { cards, pendingSignups, sessions, users } from "@/db/schema";
import { createSessionRecord, hashPassword } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { CURRENT_TERMS_VERSION } from "@/lib/terms";

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export function hashVerificationToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function makeVerificationToken() {
  return crypto.randomBytes(32).toString("base64url");
}

/** Consume a pending signup and atomically create its account, private card, and browser session. */
export async function completeSignupVerification(
  db: Database,
  input: { token: string; name: string; password: string; acceptedTerms: true },
) {
  const tokenHash = hashVerificationToken(input.token);
  const now = new Date();

  return db.transaction(async (tx) => {
    const [pending] = await tx
      .delete(pendingSignups)
      .where(and(eq(pendingSignups.tokenHash, tokenHash), gt(pendingSignups.expiresAt, now)))
      .returning({ email: pendingSignups.email });
    if (!pending) return { status: "invalid" as const };

    const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.email, pending.email)).limit(1);
    if (existing) return { status: "taken" as const };

    const [account] = await tx
      .insert(users)
      .values({
        email: pending.email,
        name: input.name,
        passwordHash: hashPassword(input.password),
        termsAcceptedAt: now,
        termsVersion: CURRENT_TERMS_VERSION,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        termsAcceptedAt: users.termsAcceptedAt,
        termsVersion: users.termsVersion,
      });

    const slug = await uniquePrivateSlug(tx, pending.email, input.name);
    const [card] = await tx
      .insert(cards)
      .values({ userId: account.id, slug, displayName: input.name, email: pending.email, accent: "lime", isPublic: false, collectLeads: false })
      .returning();

    const session = createSessionRecord(account.id);
    await tx.insert(sessions).values(session.row);
    return { status: "created" as const, account, card, session };
  });
}

/** Keep a fresh token as the only credential for an email; never retain the submitted signup password. */
export async function replacePendingSignup(db: Database, email: string, tokenHash: string) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + VERIFICATION_TTL_MS);
  await db.delete(pendingSignups).where(lte(pendingSignups.expiresAt, now));
  await db.insert(pendingSignups).values({ email, tokenHash, expiresAt }).onConflictDoUpdate({
    target: pendingSignups.email,
    set: { tokenHash, expiresAt, createdAt: now },
  });
  return expiresAt;
}

async function uniquePrivateSlug(tx: Parameters<Parameters<Database["transaction"]>[0]>[0], email: string, name: string) {
  const localPart = email.split("@")[0] ?? "";
  let base = slugify(localPart) || slugify(name) || "card";
  if (base.length < 3) base = `${base}-card`;
  base = base.slice(0, 42);
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base.slice(0, 36)}-${attempt + 1}`;
    const [taken] = await tx.select({ id: cards.id }).from(cards).where(eq(cards.slug, candidate)).limit(1);
    if (!taken) return candidate;
  }
  return `${base.slice(0, 32)}-${crypto.randomBytes(4).toString("hex")}`;
}
