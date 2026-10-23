import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { cards, type Card } from "@/db/schema";
import { slugify } from "./utils";

const RESERVED = new Set([
  "app", "api", "admin", "login", "logout", "signup", "signin", "register", "settings",
  "c", "u", "qr", "tap", "find", "new", "edit", "about", "help", "support", "hello",
  "terms", "privacy", "pricing", "blog", "docs", "static", "assets", "public", "www",
]);

export async function getCardBySlug(slug: string): Promise<Card | null> {
  const db = await getDb();
  const rows = await db.select().from(cards).where(eq(cards.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getCardByUserId(userId: string): Promise<Card | null> {
  const db = await getDb();
  const rows = await db.select().from(cards).where(eq(cards.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function isSlugAvailable(slug: string, userId: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .select({ id: cards.id })
    .from(cards)
    .where(and(eq(cards.slug, slug), ne(cards.userId, userId)))
    .limit(1);
  return rows.length === 0;
}

export async function generateUniqueSlug(seed: string): Promise<string> {
  const db = await getDb();
  let base = slugify(seed) || "card";
  if (base.length < 3) base = `${base}-card`;
  if (RESERVED.has(base)) base = `${base}-card`;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base.slice(0, 36)}-${attempt + 1}`;
    const existing = await db
      .select({ id: cards.id })
      .from(cards)
      .where(eq(cards.slug, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
  }

  return `${base.slice(0, 30)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function cardPath(slug: string): string {
  return `/c/${slug}`;
}

/** Self-heals an account that somehow has no card yet. */
export async function ensureCard(user: { id: string; name: string; email: string }): Promise<Card> {
  const existing = await getCardByUserId(user.id);
  if (existing) return existing;
  const db = await getDb();
  const slug = await generateUniqueSlug(user.email.split("@")[0].replace(/[._-]+/g, " ") || user.name);
  const [card] = await db
    .insert(cards)
    .values({ userId: user.id, slug, displayName: user.name, email: user.email })
    .returning();
  return card;
}

export function avatarUrl(cardId: string | null | undefined): string | null {
  return cardId ? `/api/avatar/${cardId}` : null;
}
