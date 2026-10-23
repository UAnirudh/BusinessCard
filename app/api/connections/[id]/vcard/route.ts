import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { connections, type Card } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { buildVCard, vcardFileName } from "@/lib/vcard";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const db = await getDb();
  const rows = await db
    .select()
    .from(connections)
    .where(and(eq(connections.id, id), eq(connections.ownerId, user.id)))
    .limit(1);

  const person = rows[0];
  if (!person) return new Response("Not found", { status: 404 });

  const asCard = {
    displayName: person.name,
    headline: person.headline,
    company: person.company,
    bio: person.bio,
    location: person.location,
    email: person.email,
    phone: person.phone,
    website: person.website,
    linkedin: null,
    twitter: null,
    github: null,
    instagram: null,
    tags: person.tags,
    links: [],
    updatedAt: person.updatedAt,
  } as unknown as Card;

  return new Response(buildVCard(asCard), {
    headers: {
      "content-type": "text/vcard; charset=utf-8",
      "content-disposition": `attachment; filename="${vcardFileName(asCard)}"`,
      "cache-control": "no-store",
    },
  });
}
