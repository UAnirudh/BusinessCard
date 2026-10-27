import { getDb } from "@/db";
import { cardReports } from "@/db/schema";
import { getCardBySlug } from "@/lib/cards";
import { clientIp, fail, isSameOrigin, ok, parseBody, rateLimit } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { cardReportSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);

  const parsed = await parseBody(request, cardReportSchema);
  if (parsed.error) return parsed.error;
  const card = await getCardBySlug(parsed.data.slug);
  if (!card || !card.isPublic) return fail("That card is not available.", 404);

  const reporter = await getCurrentUser(request);
  if (reporter?.id === card.userId) return fail("You can’t report your own card.", 400);
  if (!(await rateLimit(`card-report:${clientIp(request)}:${card.id}`, 5, 24 * 60 * 60 * 1000))) {
    return fail("Too many reports from this connection. Try again later.", 429);
  }

  const db = await getDb();
  await db
    .insert(cardReports)
    .values({
      cardId: card.id,
      reporterUserId: reporter?.id ?? null,
      reason: parsed.data.reason,
      details: parsed.data.details,
    })
    .onConflictDoNothing();

  return ok({ ok: true, message: "Thanks. Your report has been sent for review." }, 202, {
    "cache-control": "no-store",
  });
}
