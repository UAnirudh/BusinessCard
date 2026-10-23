import { getCardBySlug } from "@/lib/cards";
import { buildVCard, vcardFileName } from "@/lib/vcard";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = await getCardBySlug(slug);
  if (!card || !card.isPublic) return new Response("Not found", { status: 404 });

  return new Response(buildVCard(card), {
    headers: {
      "content-type": "text/vcard; charset=utf-8",
      "content-disposition": `attachment; filename="${vcardFileName(card)}"`,
      "cache-control": "no-store",
    },
  });
}
