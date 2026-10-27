import { and, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/db";
import { connections, userBlocks, type Card } from "@/db/schema";
import { getCardBySlug } from "@/lib/cards";
import { getCurrentUser, getViewer } from "@/lib/auth";
import { clientIp, fail, isSameOrigin, ok, parseBody, rateLimit } from "@/lib/api";
import { exchangeSchema } from "@/lib/validation";

export const runtime = "nodejs";

function cardFields(card: Card) {
  return {
    name: card.displayName,
    headline: card.headline,
    company: card.company,
    email: card.email,
    phone: card.phone,
    website: card.website,
    location: card.location,
    bio: card.bio,
    tags: card.tags,
  };
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);

  const parsed = await parseBody(request, exchangeSchema);
  if (parsed.error) return parsed.error;
  const input = parsed.data;

  if (!(await rateLimit(`exchange:${clientIp(request)}:${input.slug}`, 20, 60 * 60 * 1000))) {
    return fail("Too many exchanges from here. Try again later.", 429);
  }

  const card = await getCardBySlug(input.slug);
  if (!card || !card.isPublic) return fail("That card is not available.", 404);

  const user = await getCurrentUser(request);
  if (user?.id === card.userId) {
    return fail("This is your own card — send it to someone else.", 400);
  }

  const db = await getDb();
  const viewer = await getViewer(request);

  if (viewer) {
    const [block] = await db
      .select({ blockerUserId: userBlocks.blockerUserId })
      .from(userBlocks)
      .where(or(
        and(eq(userBlocks.blockerUserId, viewer.user.id), eq(userBlocks.blockedUserId, card.userId)),
        and(eq(userBlocks.blockerUserId, card.userId), eq(userBlocks.blockedUserId, viewer.user.id)),
      ))
      .limit(1);
    if (block) return fail("This exchange is unavailable because one of these members has blocked the other.", 403);
  }

  if (!user && !input.email && !input.phone) {
    return fail("Add an email or phone number so they can follow up.", 422);
  }

  // Signed-in member with a card: a true two-way exchange.
  if (viewer) {
    const mine = viewer.card;
    if (!mine.isPublic) {
      return fail("Make your card public before exchanging details.", 403);
    }
    const fields = cardFields(mine);

    const [existing] = await db
      .select({ id: connections.id })
      .from(connections)
      .where(and(eq(connections.ownerId, card.userId), eq(connections.cardId, mine.id)))
      .limit(1);

    if (existing) {
      await db
        .update(connections)
        .set({ ...fields, connectionUserId: viewer.user.id, updatedAt: new Date(), metAt: new Date() })
        .where(eq(connections.id, existing.id));
    } else {
      await db.insert(connections).values({
        ownerId: card.userId,
        cardId: mine.id,
        connectionUserId: viewer.user.id,
        ...fields,
        notes: input.note,
        favorite: false,
        source: "exchange",
        metAt: new Date(),
      });
    }

    const [existingBack] = await db
      .select({ id: connections.id })
      .from(connections)
      .where(and(eq(connections.ownerId, viewer.user.id), eq(connections.cardId, card.id)))
      .limit(1);

    const cardData = cardFields(card);
    if (existingBack) {
      await db
        .update(connections)
        .set({ ...cardData, connectionUserId: card.userId, updatedAt: new Date() })
        .where(eq(connections.id, existingBack.id));
    } else {
      await db.insert(connections).values({
        ownerId: viewer.user.id,
        cardId: card.id,
        connectionUserId: card.userId,
        ...cardData,
        source: "exchange",
        metAt: new Date(),
      });
    }

    return ok({ ok: true, mutual: true, name: card.displayName });
  }

  // Visitor without an account: a lead in the owner's wallet.
  if (!card.collectLeads) {
    return fail("This person isn’t collecting details right now.", 403);
  }

  const values = {
    name: input.name,
    headline: input.headline,
    company: input.company,
    email: input.email ?? user?.email ?? null,
    phone: input.phone,
    notes: input.note,
    tags: input.tags ?? [],
    source: "lead" as const,
    updatedAt: new Date(),
    metAt: new Date(),
  };

  if (input.email) {
    const [existingLead] = await db
      .select({ id: connections.id })
      .from(connections)
      .where(
        and(
          eq(connections.ownerId, card.userId),
          eq(connections.email, input.email),
          isNull(connections.cardId),
        ),
      )
      .limit(1);

    if (existingLead) {
      await db.update(connections).set(values).where(eq(connections.id, existingLead.id));
      return ok({ ok: true, mutual: false, name: card.displayName });
    }
  }

  await db.insert(connections).values({ ownerId: card.userId, ...values });
  return ok({ ok: true, mutual: false, name: card.displayName });
}
