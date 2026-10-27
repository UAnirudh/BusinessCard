import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { Database } from "@/db";
import { cards, pendingSignups, sessions, users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth";
import { completeSignupVerification, hashVerificationToken, replacePendingSignup } from "@/lib/signup-verification";

async function testDatabase() {
  const client = new PGlite();
  const db = drizzle(client, { schema }) as unknown as Database;
  await migrate(db as never, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return { client, db };
}

test("verification rotates tokens and creates the account with the mailbox owner's new password and private card", async () => {
  const { client, db } = await testDatabase();
  try {
    const firstToken = crypto.randomBytes(32).toString("base64url");
    const secondToken = crypto.randomBytes(32).toString("base64url");
    await replacePendingSignup(db, "person@example.test", hashVerificationToken(firstToken));
    await replacePendingSignup(db, "person@example.test", hashVerificationToken(secondToken));

    const [pending] = await db.select().from(pendingSignups).where(eq(pendingSignups.email, "person@example.test"));
    assert.equal(pending.tokenHash, hashVerificationToken(secondToken));
    assert.notEqual(pending.tokenHash, secondToken);
    assert.equal(await completeSignupVerification(db, { token: firstToken, name: "Wrong Name", password: "attacker-password" }).then((r) => r.status), "invalid");

    const result = await completeSignupVerification(db, { token: secondToken, name: "Mailbox Owner", password: "owner-chosen-password" });
    assert.equal(result.status, "created");
    if (result.status !== "created") return;
    assert.equal(result.account.name, "Mailbox Owner");
    assert.equal(verifyPassword("owner-chosen-password", (await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, result.account.id)))[0].passwordHash), true);
    assert.equal(verifyPassword("attacker-password", (await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, result.account.id)))[0].passwordHash), false);
    assert.equal(result.card.isPublic, false);
    assert.equal(result.card.collectLeads, false);
    assert.equal(await db.select({ id: pendingSignups.email }).from(pendingSignups).where(eq(pendingSignups.email, "person@example.test")).then((rows) => rows.length), 0);
    assert.equal(await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, result.account.id)).then((rows) => rows.length), 1);
    assert.equal(await completeSignupVerification(db, { token: secondToken, name: "Mailbox Owner", password: "another-password" }).then((r) => r.status), "invalid");
  } finally {
    await client.close();
  }
});

test("expired verification tokens cannot create accounts", async () => {
  const { client, db } = await testDatabase();
  try {
    const token = crypto.randomBytes(32).toString("base64url");
    await db.insert(pendingSignups).values({
      email: "expired@example.test",
      tokenHash: hashVerificationToken(token),
      expiresAt: new Date(Date.now() - 60_000),
    });
    assert.equal(await completeSignupVerification(db, { token, name: "Expired Person", password: "safe-password" }).then((r) => r.status), "invalid");
    assert.equal(await db.select({ id: users.id }).from(users).where(eq(users.email, "expired@example.test")).then((rows) => rows.length), 0);
    assert.equal(await db.select({ id: cards.id }).from(cards).then((rows) => rows.length), 0);
  } finally {
    await client.close();
  }
});
