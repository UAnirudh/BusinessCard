import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import type { Database } from "@/db";
import { cards, connections, sessions, users } from "@/db/schema";

async function testDatabase() {
  const client = new PGlite();
  const db = drizzle(client, { schema }) as unknown as Database;
  await migrate(db as never, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return { client, db };
}

function publicRequest(pathname: string, body?: unknown, token?: string) {
  return new Request(`https://tappd.example.test${pathname}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      host: "tappd.example.test",
      origin: "https://tappd.example.test",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      // A malformed explicit bearer token means “visitor” without relying on
      // Next's ambient cookie context when the handler runs in a unit test.
      authorization: token ? `Bearer ${token}` : "Bearer visitor",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test("exchange creates owned wallet copies, gates visitor leads, and keeps vCard download separate", async () => {
  const { client, db } = await testDatabase();
  const databaseGlobal = globalThis as typeof globalThis & {
    __tappdDb?: { promise?: Promise<Database> };
  };
  const previousDatabase = databaseGlobal.__tappdDb;

  try {
    databaseGlobal.__tappdDb = { promise: Promise.resolve(db) };
    const { POST } = await import("../app/api/exchange/route");
    const { GET: getVCard } = await import("../app/api/vcard/[slug]/route");

    const [member] = await db.insert(users).values({
      email: "exchange-member@example.test",
      name: "Exchange Member",
      passwordHash: "test-hash",
    }).returning({ id: users.id });
    const [cardOwner] = await db.insert(users).values({
      email: "exchange-owner@example.test",
      name: "Card Owner",
      passwordHash: "test-hash",
    }).returning({ id: users.id });
    const [leadOwner] = await db.insert(users).values({
      email: "lead-owner@example.test",
      name: "Lead Owner",
      passwordHash: "test-hash",
    }).returning({ id: users.id });
    const [privateLeadOwner] = await db.insert(users).values({
      email: "private-lead-owner@example.test",
      name: "Private Lead Owner",
      passwordHash: "test-hash",
    }).returning({ id: users.id });

    const [memberCard] = await db.insert(cards).values({
      userId: member.id,
      slug: "exchange-member",
      displayName: "Exchange Member",
      email: "member@example.test",
      isPublic: true,
    }).returning();
    const [ownerCard] = await db.insert(cards).values({
      userId: cardOwner.id,
      slug: "exchange-owner",
      displayName: "Card Owner",
      email: "owner@example.test",
      company: "Owner Company",
      isPublic: true,
      collectLeads: false,
    }).returning();
    const [leadCard] = await db.insert(cards).values({
      userId: leadOwner.id,
      slug: "lead-enabled",
      displayName: "Lead Owner",
      email: "lead-owner@example.test",
      isPublic: true,
      collectLeads: true,
    }).returning();
    const [privateLeadCard] = await db.insert(cards).values({
      userId: privateLeadOwner.id,
      slug: "lead-disabled",
      displayName: "Private Lead Owner",
      isPublic: true,
      collectLeads: false,
    }).returning();

    const token = crypto.randomBytes(32).toString("base64url");
    await db.insert(sessions).values({
      id: crypto.createHash("sha256").update(token).digest("hex"),
      userId: member.id,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const exchange = await POST(publicRequest("/api/exchange", {
      slug: ownerCard.slug,
      name: "Exchange Member",
      note: "Met at a Seattle meetup",
    }, token));
    assert.equal(exchange.status, 200);
    assert.deepEqual(await exchange.json(), { ok: true, mutual: true, name: "Card Owner" });

    const ownerWalletCopy = (await db.select().from(connections).where(and(
      eq(connections.ownerId, cardOwner.id),
      eq(connections.cardId, memberCard.id),
    )))[0];
    const memberWalletCopy = (await db.select().from(connections).where(and(
      eq(connections.ownerId, member.id),
      eq(connections.cardId, ownerCard.id),
    )))[0];
    assert.ok(ownerWalletCopy, "the card owner gets the member's public card in their wallet");
    assert.equal(ownerWalletCopy.connectionUserId, member.id);
    assert.equal(ownerWalletCopy.name, "Exchange Member");
    assert.equal(ownerWalletCopy.notes, "Met at a Seattle meetup");
    assert.equal(ownerWalletCopy.source, "exchange");
    assert.ok(memberWalletCopy, "the member gets the card owner's public card in their wallet");
    assert.equal(memberWalletCopy.connectionUserId, cardOwner.id);
    assert.equal(memberWalletCopy.name, "Card Owner");
    assert.equal(memberWalletCopy.source, "exchange");
    assert.equal(await db.select().from(connections).then((rows) => rows.length), 2);

    const visitorPayload = {
      slug: leadCard.slug,
      name: "Visitor Contact",
      email: "visitor@example.test",
      note: "Asked for a follow-up",
      tags: ["conference"],
    };
    const visitorExchange = await POST(publicRequest("/api/exchange", visitorPayload));
    assert.equal(visitorExchange.status, 200);
    assert.deepEqual(await visitorExchange.json(), { ok: true, mutual: false, name: "Lead Owner" });
    const [lead] = await db.select().from(connections).where(and(
      eq(connections.ownerId, leadOwner.id),
      isNull(connections.cardId),
    ));
    assert.equal(lead.name, "Visitor Contact");
    assert.equal(lead.email, "visitor@example.test");
    assert.equal(lead.notes, "Asked for a follow-up");
    assert.deepEqual(lead.tags, ["conference"]);
    assert.equal(lead.source, "lead");
    assert.equal(lead.connectionUserId, null);

    const deniedVisitorExchange = await POST(publicRequest("/api/exchange", {
      ...visitorPayload,
      slug: privateLeadCard.slug,
      email: "blocked-visitor@example.test",
    }));
    assert.equal(deniedVisitorExchange.status, 403);
    assert.equal(await db.select().from(connections).where(eq(connections.ownerId, privateLeadOwner.id)).then((rows) => rows.length), 0);

    const connectionCount = await db.select().from(connections).then((rows) => rows.length);
    const publicVCard = await getVCard(
      publicRequest(`/api/vcard/${leadCard.slug}`),
      { params: Promise.resolve({ slug: leadCard.slug }) },
    );
    assert.equal(publicVCard.status, 200);
    assert.match(publicVCard.headers.get("content-type") ?? "", /text\/vcard/i);
    assert.match(await publicVCard.text(), /FN:Lead Owner/);
    assert.equal(await db.select().from(connections).then((rows) => rows.length), connectionCount, "no-app vCard download does not create a lead or wallet entry");
  } finally {
    databaseGlobal.__tappdDb = previousDatabase;
    await client.close();
  }
});
