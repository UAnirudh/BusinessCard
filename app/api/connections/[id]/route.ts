import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { connections } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { fail, isSameOrigin, ok, parseBody } from "@/lib/api";
import { connectionUpdateSchema } from "@/lib/validation";
import { normalizeUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function ownedConnection(id: string, userId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(connections)
    .where(and(eq(connections.id, id), eq(connections.ownerId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);
  const user = await getCurrentUser();
  if (!user) return fail("Sign in first", 401);

  const { id } = await params;
  if (!(await ownedConnection(id, user.id))) return fail("Contact not found", 404);

  const parsed = await parseBody(request, connectionUpdateSchema);
  if (parsed.error) return parsed.error;
  const input = parsed.data;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) updates.name = input.name;
  if (input.headline !== undefined) updates.headline = input.headline;
  if (input.company !== undefined) updates.company = input.company;
  if (input.email !== undefined) updates.email = input.email;
  if (input.phone !== undefined) updates.phone = input.phone;
  if (input.website !== undefined) updates.website = normalizeUrl(input.website);
  if (input.location !== undefined) updates.location = input.location;
  if (input.bio !== undefined) updates.bio = input.bio;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.tags !== undefined) updates.tags = input.tags;
  if (input.favorite !== undefined) updates.favorite = input.favorite;

  const db = await getDb();
  await db.update(connections).set(updates).where(eq(connections.id, id));
  return ok({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return fail("Cross-origin request blocked", 403);
  const user = await getCurrentUser();
  if (!user) return fail("Sign in first", 401);

  const { id } = await params;
  if (!(await ownedConnection(id, user.id))) return fail("Contact not found", 404);

  const db = await getDb();
  await db.delete(connections).where(eq(connections.id, id));
  return ok({ ok: true });
}
