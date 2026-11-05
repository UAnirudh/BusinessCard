import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { cardReports, cards, users } from "@/db/schema";
import { fail, isSameOrigin, ok, parseBody } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { applyModerationDecision, isModeratorEmail } from "@/lib/moderation";
import { moderationDecisionSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function moderator(request: Request) {
  const user = await getCurrentUser(request);
  return user && isModeratorEmail(user.email) ? user : null;
}

export async function GET(request: Request) {
  const user = await moderator(request);
  if (!user) return fail("Moderator access required.", 403);

  const db = await getDb();
  const reports = await db
    .select({
      id: cardReports.id,
      cardId: cards.id,
      cardSlug: cards.slug,
      cardName: cards.displayName,
      cardOwnerEmail: users.email,
      reason: cardReports.reason,
      details: cardReports.details,
      createdAt: cardReports.createdAt,
    })
    .from(cardReports)
    .innerJoin(cards, eq(cardReports.cardId, cards.id))
    .innerJoin(users, eq(cards.userId, users.id))
    .where(eq(cardReports.status, "open"))
    .orderBy(asc(cardReports.createdAt))
    .limit(100);

  return ok({ reports }, 200, { "cache-control": "private, no-store" });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);
  const user = await moderator(request);
  if (!user) return fail("Moderator access required.", 403);

  const parsed = await parseBody(request, moderationDecisionSchema);
  if (parsed.error) return parsed.error;
  const db = await getDb();
  const handled = await applyModerationDecision(db, parsed.data.reportId, user.id, parsed.data.action);
  if (!handled) return fail("This report has already been handled or no longer exists.", 404);

  return ok({ ok: true });
}
