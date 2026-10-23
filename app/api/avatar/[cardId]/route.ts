import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { avatars } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(cardId)) {
    return new Response("Not found", { status: 404 });
  }

  const db = await getDb();
  const rows = await db
    .select({ mime: avatars.mime, data: avatars.data })
    .from(avatars)
    .where(eq(avatars.cardId, cardId))
    .limit(1);

  const avatar = rows[0];
  if (!avatar) return new Response("Not found", { status: 404 });

  const bytes = Buffer.from(avatar.data, "base64");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": avatar.mime,
      "content-length": String(bytes.byteLength),
      "cache-control": "public, max-age=300, s-maxage=3600",
    },
  });
}
