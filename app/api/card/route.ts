import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { cards } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { fail, isSameOrigin, ok, parseBody } from "@/lib/api";
import { ensureCard, isSlugAvailable } from "@/lib/cards";
import { cardUpdateSchema } from "@/lib/validation";
import { publicCardTextIssue } from "@/lib/moderation";
import { cardChangeRequiresTerms } from "@/lib/terms";
import { buildCardUpdatePatch } from "@/lib/card-updates";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return fail("Sign in first", 401);
  const card = await ensureCard(user);
  return ok({ card }, 200, { "cache-control": "private, no-store" });
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);
  const user = await getCurrentUser(request);
  if (!user) return fail("Sign in first", 401);

  const parsed = await parseBody(request, cardUpdateSchema);
  if (parsed.error) return parsed.error;
  const input = parsed.data;

  const card = await ensureCard(user);
  const db = await getDb();

  if (cardChangeRequiresTerms(user.termsAcceptedAt, user.termsVersion, card, input)) {
    return fail("Accept the Terms of Use before creating or updating card content.", 403, { code: "terms_required" });
  }

  if (input.slug && input.slug !== card.slug) {
    if (!(await isSlugAvailable(input.slug, user.id))) {
      return fail("That card address is already taken. Try another.", 409, { field: "slug" });
    }
  }

  const patch = buildCardUpdatePatch(card, input);

  const isPublic = patch.isPublic ?? card.isPublic;
  if (isPublic) {
    const issue = publicCardTextIssue([
      patch.displayName,
      patch.headline === undefined ? card.headline : patch.headline,
      patch.company === undefined ? card.company : patch.company,
      patch.bio === undefined ? card.bio : patch.bio,
      patch.location === undefined ? card.location : patch.location,
      ...(patch.tags ?? card.tags),
      ...(patch.links ?? card.links).map((link) => link.label),
    ]);
    if (issue) return fail(issue, 422);
  }

  try {
    const [updated] = await db
      .update(cards)
      .set(patch)
      .where(eq(cards.id, card.id))
      .returning({ slug: cards.slug });

    return ok({ ok: true, slug: updated.slug });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("cards_slug_unique") || message.includes("duplicate key")) {
      return fail("That card address is already taken. Try another.", 409, { field: "slug" });
    }
    console.error("[card] update failed", error);
    return fail("Could not save your card. Try again.", 500);
  }
}
