import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { connections } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const db = await getDb();
  const rows = await db
    .select()
    .from(connections)
    .where(eq(connections.ownerId, user.id))
    .orderBy(desc(connections.createdAt));

  const csv = toCsv(
    [
      "name", "headline", "company", "email", "phone", "website", "location",
      "tags", "notes", "favorite", "source", "met_at", "created_at",
    ],
    rows.map((row) => [
      row.name,
      row.headline,
      row.company,
      row.email,
      row.phone,
      row.website,
      row.location,
      row.tags.join(";"),
      row.notes,
      row.favorite ? "yes" : "no",
      row.source,
      row.metAt?.toISOString() ?? "",
      row.createdAt.toISOString(),
    ]),
  );

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="tappd-wallet-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
