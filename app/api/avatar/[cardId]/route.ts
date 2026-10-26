import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { avatars, cards } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(cardId)) {
    return new Response("Not found", { status: 404 });
  }

  const db = await getDb();
  const cardRows = await db
    .select({ id: cards.id, userId: cards.userId, isPublic: cards.isPublic })
    .from(cards)
    .where(eq(cards.id, cardId))
    .limit(1);
  const card = cardRows[0];
  if (!card) return notFound();

  const user = await getCurrentUser(request);
  const isOwner = user?.id === card.userId;
  if (!card.isPublic && !isOwner) return notFound();

  const rows = await db
    .select({ mime: avatars.mime, data: avatars.data })
    .from(avatars)
    .where(eq(avatars.cardId, cardId))
    .limit(1);

  const avatar = rows[0];
  if (!avatar) return notFound();

  const bytes = Buffer.from(avatar.data, "base64");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": avatar.mime,
      "content-length": String(bytes.byteLength),
      // Private images can be revoked at any time and must never enter shared
      // caches. Public images get only a short cache lifetime.
      "cache-control": card.isPublic ? "public, max-age=60, s-maxage=60" : "private, no-store",
    },
  });
}

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: { "cache-control": "private, no-store" },
  });
}
