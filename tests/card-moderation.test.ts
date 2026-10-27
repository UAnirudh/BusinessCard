import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { eq } from "drizzle-orm";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import type { Database } from "@/db";
import { cardReports, cards, sessions, userBlocks, users } from "@/db/schema";
import { applyModerationDecision, isModeratorEmail, publicCardTextIssue } from "@/lib/moderation";

async function testDatabase() {
  const client = new PGlite();
  const db = drizzle(client, { schema }) as unknown as Database;
  await migrate(db as never, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return { client, db };
}

test("public-card filter catches normalized profanity and leaves ordinary profile copy alone", () => {
  assert.equal(publicCardTextIssue(["Seattle product designer", "I help teams build useful tools"]), null);
  assert.notEqual(publicCardTextIssue(["ＦＵＣＫ"]), null);
  assert.notEqual(publicCardTextIssue(["f\u200buck"]), null);
});

test("moderator access matches configured email addresses without case sensitivity", () => {
  const original = process.env.TAPPD_MODERATOR_EMAILS;
  process.env.TAPPD_MODERATOR_EMAILS = " safety@example.test, owner@example.test ";
  try {
    assert.equal(isModeratorEmail("OWNER@example.test"), true);
    assert.equal(isModeratorEmail("stranger@example.test"), false);
    assert.equal(isModeratorEmail(null), false);
  } finally {
    if (original === undefined) delete process.env.TAPPD_MODERATOR_EMAILS;
    else process.env.TAPPD_MODERATOR_EMAILS = original;
  }
});

test("moderation reports persist and member blocks are idempotent", async () => {
  const { client, db } = await testDatabase();
  try {
    const [owner] = await db.insert(users).values({ email: "owner@example.test", passwordHash: "hash", name: "Card Owner" }).returning();
    const [reporter] = await db.insert(users).values({ email: "reporter@example.test", passwordHash: "hash", name: "Reporter" }).returning();
    const [card] = await db.insert(cards).values({ userId: owner.id, slug: "card-owner", displayName: "Card Owner", isPublic: true }).returning();

    await db.insert(cardReports).values({ cardId: card.id, reporterUserId: reporter.id, reason: "impersonation", details: "This profile claims to be someone else." });
    await db.insert(cardReports).values({ cardId: card.id, reporterUserId: reporter.id, reason: "spam" }).onConflictDoNothing();
    const reports = await db.select().from(cardReports).where(eq(cardReports.cardId, card.id));
    assert.equal(reports.length, 1);
    assert.equal(reports[0].status, "open");

    await db.insert(userBlocks).values({ blockerUserId: reporter.id, blockedUserId: owner.id }).onConflictDoNothing();
    await db.insert(userBlocks).values({ blockerUserId: reporter.id, blockedUserId: owner.id }).onConflictDoNothing();
    const blocks = await db.select().from(userBlocks).where(eq(userBlocks.blockerUserId, reporter.id));
    assert.equal(blocks.length, 1);
  } finally {
    await client.close();
  }
});

test("suspending a reported card owner hides their card and revokes active sessions atomically", async () => {
  const { client, db } = await testDatabase();
  try {
    const [owner] = await db.insert(users).values({ email: "unsafe@example.test", passwordHash: "hash", name: "Unsafe Owner" }).returning();
    const [reviewer] = await db.insert(users).values({ email: "moderator@example.test", passwordHash: "hash", name: "Moderator" }).returning();
    const [card] = await db.insert(cards).values({ userId: owner.id, slug: "unsafe-owner", displayName: "Unsafe Owner", isPublic: true, collectLeads: true }).returning();
    const [report] = await db.insert(cardReports).values({ cardId: card.id, reason: "objectionable" }).returning();
    await db.insert(sessions).values({ id: "existing-session", userId: owner.id, expiresAt: new Date(Date.now() + 60_000) });

    assert.equal(await applyModerationDecision(db, report.id, reviewer.id, "suspend_user"), true);
    assert.equal(await applyModerationDecision(db, report.id, reviewer.id, "suspend_user"), false);

    const [updatedUser] = await db.select().from(users).where(eq(users.id, owner.id));
    const [updatedCard] = await db.select().from(cards).where(eq(cards.id, card.id));
    const [updatedReport] = await db.select().from(cardReports).where(eq(cardReports.id, report.id));
    const remainingSessions = await db.select().from(sessions).where(eq(sessions.userId, owner.id));
    assert.ok(updatedUser.suspendedAt);
    assert.equal(updatedCard.isPublic, false);
    assert.equal(updatedCard.collectLeads, false);
    assert.equal(updatedReport.status, "reviewed");
    assert.equal(updatedReport.reviewerUserId, reviewer.id);
    assert.equal(remainingSessions.length, 0);
  } finally {
    await client.close();
  }
});
