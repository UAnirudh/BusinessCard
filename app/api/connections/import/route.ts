import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { connections } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { fail, isSameOrigin, ok } from "@/lib/api";
import { parseCsv } from "@/lib/csv";
import { normalizeUrl } from "@/lib/utils";

export const runtime = "nodejs";

const ALIASES: Record<string, string> = {
  name: "name",
  fullname: "name",
  "full name": "name",
  "display name": "name",
  email: "email",
  "email address": "email",
  phone: "phone",
  mobile: "phone",
  tel: "phone",
  company: "company",
  organisation: "company",
  organization: "company",
  org: "company",
  role: "headline",
  title: "headline",
  jobtitle: "headline",
  "job title": "headline",
  headline: "headline",
  position: "headline",
  location: "location",
  city: "location",
  address: "location",
  website: "website",
  url: "website",
  tags: "tags",
  notes: "notes",
  note: "notes",
  met: "metAt",
  date: "metAt",
  metat: "metAt",
};

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);
  const user = await getCurrentUser(request);
  if (!user) return fail("Sign in first", 401);

  let body: { csv?: string };
  try {
    body = (await request.json()) as { csv?: string };
  } catch {
    return fail("Expected a JSON body with a csv field", 400);
  }

  const raw = (body.csv ?? "").trim();
  if (!raw) return fail("Paste a CSV first", 422);
  if (raw.length > 2_000_000) return fail("That file is too large. Split it into smaller imports.", 413);

  const rows = parseCsv(raw);
  if (rows.length < 2) return fail("That CSV has no data rows. Include a header row.", 422);

  const header = rows[0].map((cell) => ALIASES[cell.toLowerCase().trim()] ?? cell.toLowerCase().trim());
  if (!header.includes("name")) {
    return fail("The CSV needs a “name” column (email, phone, company and notes are optional).", 422);
  }

  const db = await getDb();
  let imported = 0;
  let skipped = 0;

  for (const row of rows.slice(1, 501)) {
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      const value = (row[index] ?? "").trim();
      if (key && value) record[key] = value;
    });
    if (!record.name) {
      skipped += 1;
      continue;
    }

    if (record.email) {
      const [existing] = await db
        .select({ id: connections.id })
        .from(connections)
        .where(and(eq(connections.ownerId, user.id), eq(connections.email, record.email.toLowerCase())))
        .limit(1);
      if (existing) {
        skipped += 1;
        continue;
      }
    }

    const metAt = record.metAt ? new Date(record.metAt) : null;
    await db.insert(connections).values({
      ownerId: user.id,
      name: record.name.slice(0, 120),
      headline: record.headline?.slice(0, 120) ?? null,
      company: record.company?.slice(0, 120) ?? null,
      email: record.email?.toLowerCase().slice(0, 200) ?? null,
      phone: record.phone?.slice(0, 40) ?? null,
      website: normalizeUrl(record.website)?.slice(0, 300) ?? null,
      location: record.location?.slice(0, 120) ?? null,
      notes: record.notes?.slice(0, 2000) ?? null,
      tags: (record.tags ?? "")
        .split(/[;|]/)
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 12),
      source: "import",
      metAt: metAt && !Number.isNaN(metAt.getTime()) ? metAt : null,
    });
    imported += 1;
  }

  return ok({ ok: true, imported, skipped });
}
