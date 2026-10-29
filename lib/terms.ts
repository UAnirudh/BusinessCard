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

  const unchangedWhenProvided = <T,>(inputValue: T | undefined, currentValue: T | null) =>
    inputValue === undefined || inputValue === currentValue;

  const cardContentUnchanged =
    input.displayName === card.displayName &&
    unchangedWhenProvided(input.headline, card.headline) &&
    unchangedWhenProvided(input.company, card.company) &&
    unchangedWhenProvided(input.bio, card.bio) &&
    unchangedWhenProvided(input.location, card.location) &&
    unchangedWhenProvided(input.email, card.email) &&
    unchangedWhenProvided(input.phone, card.phone) &&
    unchangedWhenProvided(input.website, card.website) &&
    unchangedWhenProvided(input.linkedin, card.linkedin) &&
    unchangedWhenProvided(input.twitter, card.twitter) &&
    unchangedWhenProvided(input.github, card.github) &&
    unchangedWhenProvided(input.instagram, card.instagram) &&
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
