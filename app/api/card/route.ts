import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { cards } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { fail, isSameOrigin, ok, parseBody } from "@/lib/api";
import { ensureCard, isSlugAvailable } from "@/lib/cards";
import { cardUpdateSchema } from "@/lib/validation";
import { normalizeUrl } from "@/lib/utils";
import { publicCardTextIssue } from "@/lib/moderation";

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

  if (input.slug && input.slug !== card.slug) {
    if (!(await isSlugAvailable(input.slug, user.id))) {
      return fail("That card address is already taken. Try another.", 409, { field: "slug" });
    }
  }

  const links = (input.links ?? [])
    .map((link) => ({ label: link.label.trim(), url: normalizeUrl(link.url) ?? "" }))
    .filter((link) => link.url.length > 0)
    .slice(0, 8);

  const isPublic = input.isPublic ?? card.isPublic;
  if (isPublic) {
    const issue = publicCardTextIssue([
      input.displayName,
      input.headline,
      input.company,
      input.bio,
      input.location,
      ...(input.tags ?? []),
      ...links.map((link) => link.label),
    ]);
    if (issue) return fail(issue, 422);
  }

  try {
    const [updated] = await db
      .update(cards)
      .set({
        displayName: input.displayName,
        headline: input.headline,
        company: input.company,
        bio: input.bio,
        location: input.location,
        email: input.email,
        phone: input.phone,
        website: normalizeUrl(input.website),
        linkedin: normalizeUrl(input.linkedin),
        twitter: normalizeUrl(input.twitter),
        github: normalizeUrl(input.github),
        instagram: normalizeUrl(input.instagram),
        accent: input.accent ?? card.accent,
        tags: (input.tags ?? []).slice(0, 12),
        links,
        isPublic,
        collectLeads: input.collectLeads ?? card.collectLeads,
        slug: input.slug ?? card.slug,
        updatedAt: new Date(),
      })
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
