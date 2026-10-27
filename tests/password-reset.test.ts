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
import { passwordResetTokens, sessions, users } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { consumePasswordReset } from "@/lib/password-reset";

async function testDatabase() {
  const client = new PGlite();
  const db = drizzle(client, { schema }) as unknown as Database;
  await migrate(db as never, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return { client, db };
}

function digest(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

test("a reset token changes the password once and revokes every active session", async () => {
  const { client, db } = await testDatabase();
  try {
    const [user] = await db.insert(users).values({
      email: "reset-success@example.test",
      name: "Reset Success",
      passwordHash: hashPassword("old-password"),
    }).returning({ id: users.id });
    const token = crypto.randomBytes(32).toString("base64url");
    await db.insert(passwordResetTokens).values({ id: digest(token), userId: user.id, expiresAt: new Date(Date.now() + 60_000) });
    await db.insert(sessions).values([
      { id: "session-one", userId: user.id, expiresAt: new Date(Date.now() + 60_000) },
      { id: "session-two", userId: user.id, expiresAt: new Date(Date.now() + 60_000) },
    ]);

    assert.equal(await consumePasswordReset(db, token, "new-password"), true);
    assert.equal(await consumePasswordReset(db, token, "another-password"), false);
    const [updated] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id));
    assert.equal(verifyPassword("new-password", updated.passwordHash), true);
    assert.equal(await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, user.id)).then((rows) => rows.length), 0);
    assert.equal(await db.select({ id: passwordResetTokens.id }).from(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id)).then((rows) => rows.length), 0);
  } finally {
    await client.close();
  }
});

test("expired reset tokens do not change passwords or revoke sessions", async () => {
  const { client, db } = await testDatabase();
  try {
    const [user] = await db.insert(users).values({
      email: "reset-expired@example.test",
      name: "Reset Expired",
      passwordHash: hashPassword("old-password"),
    }).returning({ id: users.id });
    const token = crypto.randomBytes(32).toString("base64url");
    await db.insert(passwordResetTokens).values({ id: digest(token), userId: user.id, expiresAt: new Date(Date.now() - 60_000) });
    await db.insert(sessions).values({ id: "still-valid-session", userId: user.id, expiresAt: new Date(Date.now() + 60_000) });

    assert.equal(await consumePasswordReset(db, token, "new-password"), false);
    const [unchanged] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id));
    assert.equal(verifyPassword("old-password", unchanged.passwordHash), true);
    assert.equal(await db.select({ id: sessions.id }).from(sessions).where(and(eq(sessions.userId, user.id), eq(sessions.id, "still-valid-session"))).then((rows) => rows.length), 1);
  } finally {
    await client.close();
  }
});
