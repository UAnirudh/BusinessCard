import { getCardBySlug } from "@/lib/cards";
import { appleWalletPass, walletAvailability } from "@/lib/wallet";
import { clientIp, rateLimit } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(await rateLimit(`wallet:apple:${clientIp(_request)}`, 30, 60 * 60 * 1000))) {
    return new Response("Too many Wallet pass requests. Try again later.", { status: 429 });
  }
  const card = await getCardBySlug(slug);
  if (!card || !card.isPublic) return new Response("Not found", { status: 404 });
  if (!(await walletAvailability()).apple) return new Response("Apple Wallet passes are not configured yet.", { status: 503 });

  try {
    const pass = await appleWalletPass(card);
    const fileName = `${slug.replace(/[^a-zA-Z0-9_-]/g, "-")}.pkpass`;
    return new Response(new Uint8Array(pass), {
      headers: {
        "content-type": "application/vnd.apple.pkpass",
        "content-disposition": `attachment; filename="${fileName}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Could not generate Apple Wallet pass", error instanceof Error ? error.message : "unknown error");
    return new Response("Could not create this Apple Wallet pass. Please try again later.", { status: 503 });
  }
}
