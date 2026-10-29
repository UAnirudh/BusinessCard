import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { Database } from "@/db";
import { cards, connections, users } from "@/db/schema";
import { deleteAccountAndSharedCardData } from "@/lib/account-deletion";

async function testDatabase() {
  const client = new PGlite();
  const db = drizzle(client, { schema }) as unknown as Database;
  await migrate(db as never, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return { client, db };
}

test("account deletion removes recipient copies of the deleted card but keeps unrelated wallet contacts", async () => {
  const { client, db } = await testDatabase();
  try {
    const [deletedOwner] = await db.insert(users).values({
      email: "delete-owner@example.test",
      name: "Deleted Owner",
      passwordHash: "test-hash",
    }).returning({ id: users.id });
    const [recipient] = await db.insert(users).values({
      email: "recipient@example.test",
      name: "Recipient",
      passwordHash: "test-hash",
    }).returning({ id: users.id });
    const [otherOwner] = await db.insert(users).values({
      email: "other@example.test",
      name: "Other Owner",
      passwordHash: "test-hash",
    }).returning({ id: users.id });
    const [deletedCard] = await db.insert(cards).values({
      userId: deletedOwner.id,
      slug: "delete-owner",
      displayName: "Deleted Owner",
      email: "delete-owner@example.test",
      isPublic: true,
    }).returning({ id: cards.id });
    const [unrelatedCard] = await db.insert(cards).values({
      userId: otherOwner.id,
      slug: "other-owner",
      displayName: "Other Owner",
      isPublic: true,
    }).returning({ id: cards.id });

    await db.insert(connections).values([
      {
        ownerId: recipient.id,
        cardId: deletedCard.id,
        connectionUserId: deletedOwner.id,
        name: "Deleted Owner",
        email: "delete-owner@example.test",
        notes: "Met at a conference",
      },
      {
        ownerId: recipient.id,
        connectionUserId: deletedOwner.id,
        name: "Deleted Owner copy",
        phone: "+1 206 555 0100",
      },
      {
        ownerId: recipient.id,
        cardId: unrelatedCard.id,
        connectionUserId: otherOwner.id,
        name: "Other Owner",
        notes: "Keep this unrelated note",
      },
    ]);

    assert.equal(await deleteAccountAndSharedCardData(db, deletedOwner.id), true);

    const recipientRows = await db.select().from(connections).where(eq(connections.ownerId, recipient.id));
    assert.equal(recipientRows.length, 1);
    assert.equal(recipientRows[0].name, "Other Owner");
    assert.equal(recipientRows[0].notes, "Keep this unrelated note");
    assert.equal(await db.select({ id: users.id }).from(users).where(eq(users.id, deletedOwner.id)).then((rows) => rows.length), 0);
    assert.equal(await db.select({ id: cards.id }).from(cards).where(eq(cards.id, deletedCard.id)).then((rows) => rows.length), 0);
  } finally {
    await client.close();
  }
});
