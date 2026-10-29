import { getCardBySlug } from "@/lib/cards";
import { googleWalletSaveUrl, walletAvailability } from "@/lib/wallet";
import { clientIp, rateLimit } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(await rateLimit(`wallet:google:${clientIp(_request)}`, 30, 60 * 60 * 1000))) {
    return new Response("Too many Wallet pass requests. Try again later.", { status: 429 });
  }
  const card = await getCardBySlug(slug);
  if (!card || !card.isPublic) return new Response("Not found", { status: 404 });
  if (!(await walletAvailability()).google) return new Response("Google Wallet passes are not configured yet.", { status: 503 });

  try {
    const saveUrl = await googleWalletSaveUrl(card);
    return new Response(null, {
      status: 302,
      headers: { location: saveUrl, "cache-control": "private, no-store" },
    });
  } catch (error) {
    console.error("Could not create Google Wallet link", error instanceof Error ? error.message : "unknown error");
    return new Response("Could not create this Google Wallet pass. Please try again later.", { status: 503 });
  }
}
