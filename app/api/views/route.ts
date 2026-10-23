import { getDb } from "@/db";
import { cardViews } from "@/db/schema";
import { getCardBySlug } from "@/lib/cards";
import { getCurrentUser } from "@/lib/auth";
import { clientIp, fail, isSameOrigin, ok, parseBody, rateLimit } from "@/lib/api";
import { viewSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);
  if (!rateLimit(`view:${clientIp(request)}`, 90, 60 * 60 * 1000)) {
    return ok({ ok: true, skipped: true });
  }

  const parsed = await parseBody(request, viewSchema);
  if (parsed.error) return parsed.error;

  const card = await getCardBySlug(parsed.data.slug);
  if (!card || !card.isPublic) return ok({ ok: true, skipped: true });

  const viewer = await getCurrentUser();
  if (viewer?.id === card.userId) return ok({ ok: true, skipped: true });

  const db = await getDb();
  await db.insert(cardViews).values({ cardId: card.id, source: parsed.data.source ?? "link" });
  return ok({ ok: true });
}
