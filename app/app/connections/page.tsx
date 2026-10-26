import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { cards, connections } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasAvatarMany } from "@/lib/avatars";
import { avatarUrl } from "@/lib/cards";
import { ConnectionsBrowser, type WalletPerson } from "@/components/connections-browser";

export const metadata: Metadata = { title: "Wallet" };
export const dynamic = "force-dynamic";

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const params = await searchParams;

  const db = await getDb();
  const rows = await db
    .select({
      id: connections.id,
      name: connections.name,
      headline: connections.headline,
      company: connections.company,
      email: connections.email,
      phone: connections.phone,
      location: connections.location,
      tags: connections.tags,
      notes: connections.notes,
      followUpDate: connections.followUpDate,
      favorite: connections.favorite,
      source: connections.source,
      createdAt: connections.createdAt,
      updatedAt: connections.updatedAt,
      cardId: connections.cardId,
      cardSlug: cards.slug,
    })
    .from(connections)
    .leftJoin(cards, eq(connections.cardId, cards.id))
    .where(eq(connections.ownerId, user.id))
    .orderBy(desc(connections.updatedAt))
    .limit(1000);

  const cardIds = rows.map((row) => row.cardId).filter(Boolean) as string[];
  const withAvatar = await hasAvatarMany(cardIds);

  const people: WalletPerson[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    headline: row.headline,
    company: row.company,
    email: row.email,
    phone: row.phone,
    location: row.location,
    tags: row.tags,
    notes: row.notes,
    followUpDate: row.followUpDate,
    favorite: row.favorite,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    avatarUrl: row.cardId && withAvatar.has(row.cardId) ? avatarUrl(row.cardId) : null,
    cardSlug: row.cardSlug ?? null,
  }));

  return <ConnectionsBrowser people={people} initialNew={params.new === "1"} />;
}
