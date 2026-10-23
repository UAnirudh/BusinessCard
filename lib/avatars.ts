import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { avatars } from "@/db/schema";

export async function hasAvatar(cardId: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db.select({ cardId: avatars.cardId }).from(avatars).where(eq(avatars.cardId, cardId)).limit(1);
  return rows.length > 0;
}

export async function hasAvatarMany(cardIds: string[]): Promise<Set<string>> {
  const ids = cardIds.filter(Boolean);
  if (ids.length === 0) return new Set();
  const db = await getDb();
  const rows = await db.select({ cardId: avatars.cardId }).from(avatars);
  return new Set(rows.map((row) => row.cardId).filter((id) => ids.includes(id)));
}
