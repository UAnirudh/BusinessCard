import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { ensureCard } from "@/lib/cards";
import { getOrigin } from "@/lib/origin";
import { TapShare } from "@/components/tap-share";

export const metadata: Metadata = { title: "Tap & share" };
export const dynamic = "force-dynamic";

export default async function TapPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const card = await ensureCard(user);
  const origin = await getOrigin();

  return (
    <TapShare
      slug={card.slug}
      url={`${origin}/c/${card.slug}`}
      displayName={card.displayName}
    />
  );
}
