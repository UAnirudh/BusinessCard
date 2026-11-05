import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { avatars } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { fail, isSameOrigin, ok } from "@/lib/api";
import { ensureCard } from "@/lib/cards";
import { CURRENT_TERMS_VERSION } from "@/lib/terms";

export const runtime = "nodejs";

const MAX_BYTES = 1_500_000;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);
  const user = await getCurrentUser(request);
  if (!user) return fail("Sign in first", 401);
  if (!user.termsAcceptedAt || user.termsVersion !== CURRENT_TERMS_VERSION) {
    return fail("Accept the Terms of Use before uploading card content.", 403, { code: "terms_required" });
  }

  let body: { dataUrl?: string };
  try {
    body = (await request.json()) as { dataUrl?: string };
  } catch {
    return fail("Expected a JSON body", 400);
  }

  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(body.dataUrl ?? "");
  if (!match) return fail("Upload a JPEG, PNG or WebP image.", 422);
  const [, mime, base64] = match;
  if (!ALLOWED.has(mime)) return fail("Upload a JPEG, PNG or WebP image.", 422);

  const bytes = Buffer.from(base64, "base64");
  if (bytes.byteLength > MAX_BYTES) return fail("That image is too large. Use one under 1.5 MB.", 413);

  const card = await ensureCard(user);
  const db = await getDb();
  await db
    .insert(avatars)
    .values({ cardId: card.id, mime, data: base64, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: avatars.cardId,
      set: { mime, data: base64, updatedAt: new Date() },
    });

  return ok({ ok: true, url: `/api/avatar/${card.id}?v=${Date.now()}` });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);
  const user = await getCurrentUser(request);
  if (!user) return fail("Sign in first", 401);

  const card = await ensureCard(user);
  const db = await getDb();
  await db.delete(avatars).where(eq(avatars.cardId, card.id));
  return ok({ ok: true });
}
