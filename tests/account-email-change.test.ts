import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { and, eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { Database } from "@/db";
import { accountEmailChangeTokens, cards, sessions, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { consumeAccountEmailChange, verifyAccountEmailChangePassword } from "@/lib/account-email-change";

async function testDatabase() {
  const client = new PGlite();
  const db = drizzle(client, { schema }) as unknown as Database;
  await migrate(db as never, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return { client, db };
}

function digest(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

test("email change verifies the new address, syncs the card, preserves sessions, and is single-use", async () => {
  const { client, db } = await testDatabase();
  try {
    const passwordHash = hashPassword("correct-password");
    const [user] = await db.insert(users).values({
      email: "before@example.test",
      name: "Email Change",
      passwordHash,
    }).returning({ id: users.id });
    await db.insert(cards).values({ userId: user.id, slug: "email-change", displayName: "Email Change", email: "before@example.test" });
    await db.insert(sessions).values({ id: "email-change-session", userId: user.id, expiresAt: new Date(Date.now() + 60_000) });

    const token = crypto.randomBytes(32).toString("base64url");
    await db.insert(accountEmailChangeTokens).values({
      id: digest(token), userId: user.id, pendingEmail: "after@example.test", expiresAt: new Date(Date.now() + 60_000),
    });

    assert.equal(verifyAccountEmailChangePassword("correct-password", passwordHash), true);
    assert.equal(verifyAccountEmailChangePassword("wrong-password", passwordHash), false);
    assert.equal(await consumeAccountEmailChange(db, token), "confirmed");
    assert.equal(await consumeAccountEmailChange(db, token), "invalid");

    const [updatedUser] = await db.select({ email: users.email }).from(users).where(eq(users.id, user.id));
    const [updatedCard] = await db.select({ email: cards.email }).from(cards).where(eq(cards.userId, user.id));
    assert.equal(updatedUser.email, "after@example.test");
    assert.equal(updatedCard.email, "after@example.test");
    assert.equal(await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, user.id)).then((rows) => rows.length), 1);
  } finally {
    await client.close();
  }
});

test("expired email-change tokens do not update the account", async () => {
  const { client, db } = await testDatabase();
  try {
    const [user] = await db.insert(users).values({
      email: "expired-before@example.test",
      name: "Expired Change",
      passwordHash: hashPassword("correct-password"),
    }).returning({ id: users.id });
    const token = crypto.randomBytes(32).toString("base64url");
    await db.insert(accountEmailChangeTokens).values({
      id: digest(token), userId: user.id, pendingEmail: "expired-after@example.test", expiresAt: new Date(Date.now() - 60_000),
    });

    assert.equal(await consumeAccountEmailChange(db, token), "invalid");
    const [unchanged] = await db.select({ email: users.email }).from(users).where(eq(users.id, user.id));
    assert.equal(unchanged.email, "expired-before@example.test");
  } finally {
    await client.close();
  }
});

test("email-change confirmation rejects an address claimed by another account", async () => {
  const { client, db } = await testDatabase();
  try {
    const [user] = await db.insert(users).values({
      email: "owner@example.test", name: "Owner", passwordHash: hashPassword("correct-password"),
    }).returning({ id: users.id });
    const [other] = await db.insert(users).values({
      email: "taken@example.test", name: "Other", passwordHash: hashPassword("correct-password"),
    }).returning({ id: users.id });
    await db.insert(cards).values({ userId: user.id, slug: "owner-card", displayName: "Owner", email: "owner@example.test" });
    const token = crypto.randomBytes(32).toString("base64url");
    await db.insert(accountEmailChangeTokens).values({
      id: digest(token), userId: user.id, pendingEmail: "taken@example.test", expiresAt: new Date(Date.now() + 60_000),
    });

    assert.equal(await consumeAccountEmailChange(db, token), "taken");
    const [unchangedUser] = await db.select({ email: users.email }).from(users).where(eq(users.id, user.id));
    const [unchangedCard] = await db.select({ email: cards.email }).from(cards).where(eq(cards.userId, user.id));
    const [otherUser] = await db.select({ email: users.email }).from(users).where(eq(users.id, other.id));
    assert.equal(unchangedUser.email, "owner@example.test");
    assert.equal(unchangedCard.email, "owner@example.test");
    assert.equal(otherUser.email, "taken@example.test");
    assert.equal(await db.select({ id: accountEmailChangeTokens.id }).from(accountEmailChangeTokens).where(and(eq(accountEmailChangeTokens.userId, user.id), eq(accountEmailChangeTokens.id, digest(token)))).then((rows) => rows.length), 0);
  } finally {
    await client.close();
  }
});
