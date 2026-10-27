import { normalizePublicText } from "@/lib/public-content-filter";
import { and, eq } from "drizzle-orm";
import type { Database } from "@/db";
import { cardReports, cards, sessions, users } from "@/db/schema";

const forbiddenPublicText = /\b(?:fuck(?:er|ing|ed|s)?|shit(?:ty|ting|s)?|bitch(?:es)?|asshole|cunt|porn(?:ography)?|rape(?:d|s)?|kill\s+(?:yourself|him|her|them)|i(?:'|’)ll\s+kill\s+you)\b/i;

/** Basic English-language check for explicit or threatening public-card copy. */
export function publicCardTextIssue(values: Array<string | null | undefined>): string | null {
  return values.some((value) => value && forbiddenPublicText.test(normalizePublicText(value)))
    ? "This card contains language that cannot be shown publicly. Edit it and try again."
    : null;
}

export function isModeratorEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const configured = process.env.TAPPD_MODERATOR_EMAILS ?? "";
  return configured
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.trim().toLowerCase());
}

export type ModerationAction = "dismiss" | "hide_card" | "suspend_user";

/** Creates one open report per signed-in reporter and card. Reviewed reports can be submitted again. */
export async function createCardReport(
  db: Database,
  report: { cardId: string; reporterUserId: string | null; reason: string; details: string | null },
): Promise<boolean> {
  const [created] = await db
    .insert(cardReports)
    .values(report)
    .onConflictDoNothing()
    .returning({ id: cardReports.id });
  return Boolean(created);
}

/** Applies a moderator decision atomically; false means the report is no longer open. */
export async function applyModerationDecision(
  db: Database,
  reportId: string,
  reviewerUserId: string,
  action: ModerationAction,
  now = new Date(),
): Promise<boolean> {
  let handled = false;
  await db.transaction(async (tx) => {
    const [report] = await tx
      .update(cardReports)
      .set({
        status: action === "dismiss" ? "dismissed" : "reviewed",
        reviewedAt: now,
        reviewerUserId,
      })
      .where(and(eq(cardReports.id, reportId), eq(cardReports.status, "open")))
      .returning({ id: cardReports.id, cardId: cardReports.cardId });
    if (!report) return;
    handled = true;

    if (action === "hide_card") {
      await tx.update(cards).set({ isPublic: false, collectLeads: false, updatedAt: now }).where(eq(cards.id, report.cardId));
    } else if (action === "suspend_user") {
      const [card] = await tx.select({ ownerId: cards.userId }).from(cards).where(eq(cards.id, report.cardId)).limit(1);
      if (!card) return;
      await tx.update(users).set({ suspendedAt: now }).where(eq(users.id, card.ownerId));
      await tx.update(cards).set({ isPublic: false, collectLeads: false, updatedAt: now }).where(eq(cards.userId, card.ownerId));
      await tx.delete(sessions).where(eq(sessions.userId, card.ownerId));
    }
  });
  return handled;
}
