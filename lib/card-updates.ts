import type { Card } from "@/db/schema";
import { normalizeUrl } from "@/lib/utils";
import type { CardUpdateInput } from "@/lib/validation";

/** Build a Drizzle update set without erasing fields omitted from a PATCH request. */
export function buildCardUpdatePatch(card: Card, input: CardUpdateInput): Partial<Card> {
  const links = input.links?.map((link) => ({ label: link.label.trim(), url: normalizeUrl(link.url) ?? "" }))
    .filter((link) => link.url.length > 0)
    .slice(0, 8);

  return {
    displayName: input.displayName,
    headline: input.headline,
    company: input.company,
    bio: input.bio,
    location: input.location,
    email: input.email,
    phone: input.phone,
    website: input.website === undefined ? undefined : normalizeUrl(input.website),
    linkedin: input.linkedin === undefined ? undefined : normalizeUrl(input.linkedin),
    twitter: input.twitter === undefined ? undefined : normalizeUrl(input.twitter),
    github: input.github === undefined ? undefined : normalizeUrl(input.github),
    instagram: input.instagram === undefined ? undefined : normalizeUrl(input.instagram),
    accent: input.accent ?? card.accent,
    tags: input.tags?.slice(0, 12),
    links,
    isPublic: input.isPublic ?? card.isPublic,
    collectLeads: input.collectLeads ?? card.collectLeads,
    slug: input.slug ?? card.slug,
    updatedAt: new Date(),
  };
}
