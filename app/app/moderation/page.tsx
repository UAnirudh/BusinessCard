import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { cardReports, cards, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { isModeratorEmail } from "@/lib/moderation";
import { ModerationQueue } from "@/components/moderation-queue";

export const metadata: Metadata = { title: "Safety review" };
export const dynamic = "force-dynamic";

export default async function ModerationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fapp%2Fmoderation");
  if (!isModeratorEmail(user.email)) notFound();

  const db = await getDb();
  const reports = await db
    .select({
      id: cardReports.id,
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

  return (
    <div>
      <header>
        <p className="eyebrow">Safety</p>
        <h1 className="mt-2 text-[1.8rem] font-semibold tracking-[-0.035em]">Card report review</h1>
        <p className="mt-1 text-[0.9rem] text-muted">Review reports promptly. Hiding a card stops public access and new visitor submissions.</p>
      </header>
      <ModerationQueue initialReports={reports.map((report) => ({ ...report, createdAt: report.createdAt.toISOString() }))} />
    </div>
  );
}
