import type { Card } from "@/db/schema";
import type { CardUpdateInput } from "@/lib/validation";

export const CURRENT_TERMS_VERSION = "2026-10-28";

/**
 * Existing members may make an already-public card private without accepting
 * new terms. Every other card-content change requires explicit acceptance.
 */
export function cardChangeRequiresTerms(
  acceptedAt: Date | null,
  acceptedVersion: string | null,
  card: Card,
  input: CardUpdateInput,
): boolean {
  if (acceptedAt && acceptedVersion === CURRENT_TERMS_VERSION) return false;

  const cardContentUnchanged =
    input.displayName === card.displayName &&
    (input.headline ?? null) === card.headline &&
    (input.company ?? null) === card.company &&
    (input.bio ?? null) === card.bio &&
    (input.location ?? null) === card.location &&
    (input.email ?? null) === card.email &&
    (input.phone ?? null) === card.phone &&
    (input.website ?? null) === card.website &&
    (input.linkedin ?? null) === card.linkedin &&
    (input.twitter ?? null) === card.twitter &&
    (input.github ?? null) === card.github &&
    (input.instagram ?? null) === card.instagram &&
    (input.accent ?? card.accent) === card.accent &&
    JSON.stringify(input.tags ?? card.tags) === JSON.stringify(card.tags) &&
    JSON.stringify(input.links ?? card.links) === JSON.stringify(card.links) &&
    (input.slug ?? card.slug) === card.slug;

  const collectLeadsUnchanged = (input.collectLeads ?? card.collectLeads) === card.collectLeads;
  if (card.isPublic && input.isPublic === false && cardContentUnchanged && (input.collectLeads ?? card.collectLeads) === false) {
    return false;
  }

  const contentUnchanged = cardContentUnchanged && collectLeadsUnchanged;
  return !contentUnchanged || (input.isPublic ?? card.isPublic);
}
