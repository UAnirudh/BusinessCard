import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import type { Database } from "@/db";
import { connections, sessions, users } from "@/db/schema";

async function testDatabase() {
  const client = new PGlite();
  const db = drizzle(client, { schema }) as unknown as Database;
  await migrate(db as never, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return { client, db };
}

function bearer(token: string, id: string, body: unknown) {
  return new Request(`https://tappd.example.test/api/connections/${id}`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      host: "tappd.example.test",
      origin: "https://tappd.example.test",
    },
    body: JSON.stringify(body),
  });
}

test("contact notes PATCH is owner-only, clearable, and capped at 2,000 characters", async () => {
  const { client, db } = await testDatabase();
  const databaseGlobal = globalThis as typeof globalThis & {
    __tappdDb?: { promise?: Promise<Database> };
  };
  const previousDatabase = databaseGlobal.__tappdDb;
  const ownerToken = crypto.randomBytes(32).toString("base64url");
  const otherToken = crypto.randomBytes(32).toString("base64url");

  try {
    databaseGlobal.__tappdDb = { promise: Promise.resolve(db) };
    const { PATCH } = await import("../app/api/connections/[id]/route");

    const [owner] = await db.insert(users).values({
      email: "connection-owner@example.test",
      name: "Connection Owner",
      passwordHash: "test-hash",
    }).returning({ id: users.id });
    const [otherUser] = await db.insert(users).values({
      email: "connection-other@example.test",
      name: "Other User",
      passwordHash: "test-hash",
    }).returning({ id: users.id });
    await db.insert(sessions).values([
      { id: crypto.createHash("sha256").update(ownerToken).digest("hex"), userId: owner.id, expiresAt: new Date(Date.now() + 60_000) },
      { id: crypto.createHash("sha256").update(otherToken).digest("hex"), userId: otherUser.id, expiresAt: new Date(Date.now() + 60_000) },
    ]);
    const [connection] = await db.insert(connections).values({
      ownerId: owner.id,
      name: "New Contact",
      notes: "Original note",
    }).returning({ id: connections.id });

    const save = (token: string, body: unknown) => PATCH(
      bearer(token, connection.id, body),
      { params: Promise.resolve({ id: connection.id }) },
    );

    const saved = await save(ownerToken, { notes: "  Met at the Seattle event.  " });
    assert.equal(saved.status, 200);
    assert.equal((await db.select({ notes: connections.notes }).from(connections).where(eq(connections.id, connection.id)))[0].notes, "Met at the Seattle event.");

    const maximumLength = "x".repeat(2_000);
    const maximumLengthSaved = await save(ownerToken, { notes: maximumLength });
    assert.equal(maximumLengthSaved.status, 200);
    assert.equal((await db.select({ notes: connections.notes }).from(connections).where(eq(connections.id, connection.id)))[0].notes, maximumLength);

    await save(ownerToken, { notes: "Met at the Seattle event." });
    const rejected = await save(ownerToken, { notes: "x".repeat(2_001) });
    assert.equal(rejected.status, 422);
    assert.equal((await db.select({ notes: connections.notes }).from(connections).where(eq(connections.id, connection.id)))[0].notes, "Met at the Seattle event.");

    const cleared = await save(ownerToken, { notes: "   " });
    assert.equal(cleared.status, 200);
    assert.equal((await db.select({ notes: connections.notes }).from(connections).where(eq(connections.id, connection.id)))[0].notes, null);

    const unauthorizedUpdate = await save(otherToken, { notes: "Attempted overwrite" });
    assert.equal(unauthorizedUpdate.status, 404);
    assert.equal((await db.select({ notes: connections.notes }).from(connections).where(eq(connections.id, connection.id)))[0].notes, null);
  } finally {
    databaseGlobal.__tappdDb = previousDatabase;
    await client.close();
  }
});
