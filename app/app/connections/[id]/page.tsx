import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { cards, connections } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasAvatar } from "@/lib/avatars";
import { avatarUrl } from "@/lib/cards";
import { ConnectionDetail } from "@/components/connection-detail";

export const metadata: Metadata = { title: "Contact" };
export const dynamic = "force-dynamic";

export default async function ConnectionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const db = await getDb();
  const rows = await db
    .select({
      person: connections,
      cardSlug: cards.slug,
    })
    .from(connections)
    .leftJoin(cards, eq(connections.cardId, cards.id))
    .where(and(eq(connections.id, id), eq(connections.ownerId, user.id)))
    .limit(1);

  const row = rows[0];
  if (!row) notFound();

  const photo = row.person.cardId ? await hasAvatar(row.person.cardId) : false;
  const person = row.person;

  return (
    <ConnectionDetail
      person={{
        id: person.id,
        name: person.name,
        headline: person.headline,
        company: person.company,
        email: person.email,
        phone: person.phone,
        website: person.website,
        location: person.location,
        bio: person.bio,
        notes: person.notes,
        followUpDate: person.followUpDate,
        tags: person.tags,
        favorite: person.favorite,
        source: person.source,
        metAt: person.metAt?.toISOString() ?? null,
        createdAt: person.createdAt.toISOString(),
        updatedAt: person.updatedAt.toISOString(),
        cardSlug: row.cardSlug ?? null,
        avatarUrl: photo && person.cardId ? avatarUrl(person.cardId) : null,
      }}
    />
  );
}
