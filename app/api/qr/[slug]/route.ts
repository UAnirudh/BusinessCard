import QRCode from "qrcode";
import { getCardBySlug } from "@/lib/cards";
import { absoluteUrl } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = await getCardBySlug(slug);
  if (!card || !card.isPublic) return new Response("Not found", { status: 404 });

  const url = new URL(request.url);
  const source = url.searchParams.get("src") === "nfc" ? "nfc" : "qr";
  const target = absoluteUrl(request, `/c/${card.slug}?src=${source}`);

  const svg = await QRCode.toString(target, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0b0b0d", light: "#ffffff" },
  });

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
