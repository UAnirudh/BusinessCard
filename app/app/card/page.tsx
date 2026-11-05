import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { CURRENT_TERMS_VERSION } from "@/lib/terms";
import { ensureCard } from "@/lib/cards";
import { hasAvatar } from "@/lib/avatars";
import { getOrigin } from "@/lib/origin";
import { CardEditor } from "@/components/card-editor";

export const metadata: Metadata = { title: "My card" };
export const dynamic = "force-dynamic";

export default async function CardStudioPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const card = await ensureCard(user);
  const [photo, origin] = await Promise.all([hasAvatar(card.id), getOrigin()]);
  const host = origin.replace(/^https?:\/\//, "");

  return (
    <CardEditor
      host={host}
    hasAcceptedTerms={Boolean(user.termsAcceptedAt && user.termsVersion === CURRENT_TERMS_VERSION)}
      initialAvatar={photo ? `/api/avatar/${card.id}` : null}
      initial={{
        slug: card.slug,
        displayName: card.displayName,
        headline: card.headline ?? "",
        company: card.company ?? "",
        bio: card.bio ?? "",
        location: card.location ?? "",
        email: card.email ?? "",
        phone: card.phone ?? "",
        website: card.website ?? "",
        linkedin: card.linkedin ?? "",
        twitter: card.twitter ?? "",
        github: card.github ?? "",
        instagram: card.instagram ?? "",
        accent: card.accent,
        tags: card.tags,
        links: card.links,
        isPublic: card.isPublic,
        collectLeads: card.collectLeads,
      }}
    />
  );
}
