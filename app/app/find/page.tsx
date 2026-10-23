import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { cards, connections } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasAvatarMany } from "@/lib/avatars";
import { avatarUrl } from "@/lib/cards";
import { FindSearch, type FindPerson } from "@/components/find-search";

export const metadata: Metadata = { title: "Find someone" };
export const dynamic = "force-dynamic";

export default async function FindPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const db = await getDb();
  const rows = await db
    .select({
      id: connections.id,
      name: connections.name,
      headline: connections.headline,
      company: connections.company,
      location: connections.location,
      tags: connections.tags,
      notes: connections.notes,
      email: connections.email,
      website: connections.website,
      bio: connections.bio,
      favorite: connections.favorite,
      updatedAt: connections.updatedAt,
      source: connections.source,
      cardId: connections.cardId,
      cardSlug: cards.slug,
    })
    .from(connections)
    .leftJoin(cards, eq(connections.cardId, cards.id))
    .where(eq(connections.ownerId, user.id))
    .orderBy(desc(connections.updatedAt))
    .limit(2000);

  const cardIds = rows.map((row) => row.cardId).filter(Boolean) as string[];
  const withAvatar = await hasAvatarMany(cardIds);

  const people: FindPerson[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    headline: row.headline,
    company: row.company,
    location: row.location,
    tags: row.tags,
    notes: row.notes,
    email: row.email,
    website: row.website,
    bio: row.bio,
    favorite: row.favorite,
    updatedAt: row.updatedAt.toISOString(),
    source: row.source,
    avatarUrl: row.cardId && withAvatar.has(row.cardId) ? avatarUrl(row.cardId) : null,
    cardSlug: row.cardSlug ?? null,
  }));

  return <FindSearch people={people} />;
}
