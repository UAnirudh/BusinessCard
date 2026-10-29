import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { cards, userBlocks } from "@/db/schema";
import { getCardBySlug } from "@/lib/cards";
import { fail, isSameOrigin, ok, parseBody } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { userBlockSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return fail("Sign in first", 401);
  const db = await getDb();
  const blockedUsers = await db
    .select({ slug: cards.slug, name: cards.displayName })
    .from(userBlocks)
    .innerJoin(cards, eq(userBlocks.blockedUserId, cards.userId))
    .where(eq(userBlocks.blockerUserId, user.id))
    .orderBy(asc(cards.displayName));
  return ok({ blockedUsers }, 200, { "cache-control": "private, no-store" });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);
  const user = await getCurrentUser(request);
  if (!user) return fail("Sign in to block a member.", 401);
  const parsed = await parseBody(request, userBlockSchema);
  if (parsed.error) return parsed.error;

  const card = await getCardBySlug(parsed.data.slug);
  if (!card || !card.isPublic) return fail("That card is not available.", 404);
  if (card.userId === user.id) return fail("You can’t block your own card.", 400);

  const db = await getDb();
  await db
    .insert(userBlocks)
    .values({ blockerUserId: user.id, blockedUserId: card.userId })
    .onConflictDoNothing();
  return ok({ ok: true });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);
  const user = await getCurrentUser(request);
  if (!user) return fail("Sign in first", 401);
  const parsed = await parseBody(request, userBlockSchema);
  if (parsed.error) return parsed.error;

  const card = await getCardBySlug(parsed.data.slug);
  if (!card) return fail("That card is not available.", 404);
  const db = await getDb();
  await db
    .delete(userBlocks)
    .where(and(eq(userBlocks.blockerUserId, user.id), eq(userBlocks.blockedUserId, card.userId)));
  return ok({ ok: true });
}
