import { and, eq, ne, or } from "drizzle-orm";
import type { Database } from "@/db";
import { cards, connections, users } from "@/db/schema";

/**
 * Delete a member and recipient-wallet snapshots of that member's card.
 * Unrelated contacts and notes in other members' wallets are preserved.
 */
export async function deleteAccountAndSharedCardData(db: Database, userId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [card] = await tx.select({ id: cards.id }).from(cards).where(eq(cards.userId, userId)).limit(1);
    const sharedReferenceConditions = [eq(connections.connectionUserId, userId)];
    if (card) sharedReferenceConditions.push(eq(connections.cardId, card.id));

    await tx
      .delete(connections)
      .where(and(ne(connections.ownerId, userId), or(...sharedReferenceConditions)));

    const [deleted] = await tx.delete(users).where(eq(users.id, userId)).returning({ id: users.id });
    return Boolean(deleted);
  });
}
