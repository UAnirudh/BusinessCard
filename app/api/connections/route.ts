import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { connections } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { fail, isSameOrigin, ok, parseBody } from "@/lib/api";
import { connectionCreateSchema } from "@/lib/validation";
import { normalizeUrl } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in first", 401);
  const db = await getDb();
  const rows = await db
    .select()
    .from(connections)
    .where(eq(connections.ownerId, user.id))
    .orderBy(desc(connections.updatedAt))
    .limit(1000);
  return ok({ connections: rows });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);
  const user = await getCurrentUser();
  if (!user) return fail("Sign in first", 401);

  const parsed = await parseBody(request, connectionCreateSchema);
  if (parsed.error) return parsed.error;
  const input = parsed.data;

  const db = await getDb();
  const [created] = await db
    .insert(connections)
    .values({
      ownerId: user.id,
      name: input.name,
      headline: input.headline,
      company: input.company,
      email: input.email,
      phone: input.phone,
      website: normalizeUrl(input.website),
      location: input.location,
      bio: input.bio,
      notes: input.notes,
      tags: input.tags ?? [],
      source: "manual",
      metAt: input.metAt ? new Date(input.metAt) : new Date(),
    })
    .returning({ id: connections.id });

  return ok({ ok: true, id: created.id }, 201);
}
