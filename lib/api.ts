import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { lt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { databaseUrl, getDb } from "@/db";
import { rateLimits } from "@/db/schema";
import { configuredPublicOrigin } from "@/lib/public-origin";

export function ok<T>(data: T, status = 200, headers?: HeadersInit) {
  return NextResponse.json(data, { status, headers });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

type ParseResult<T> = { data: T; error?: never } | { data?: never; error: NextResponse };

export async function parseBody<S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<ParseResult<z.infer<S>>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { error: fail("Expected a JSON body", 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      error: fail(first?.message ?? "Invalid input", 422, {
        field: first?.path?.join(".") ?? null,
      }),
    };
  }
  return { data: parsed.data };
}

/**
 * Rejects cross-site writes. Browser requests carry an Origin; same-site fetch
 * and non-browser clients without an Origin header are allowed because the
 * session cookie is SameSite=Lax and HttpOnly.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function clientIp(request: Request): string {
  // Forwarding headers are client-controlled unless the deployment's trusted
  // edge strips incoming values and writes its own. Never infer trust from a
  // conventional header name. Without an explicit deployment setting, use a
  // shared bucket so an attacker cannot evade throttles by rotating headers.
  const headerName = process.env.TAPPD_TRUSTED_CLIENT_IP_HEADER?.trim().toLowerCase();
  if (!headerName || !/^[!#$%&'*+.^_`|~0-9a-z-]+$/.test(headerName)) return "unattributed";

  const value = request.headers.get(headerName)?.trim();
  // The configured header must contain one IP address, not a client-supplied
  // comma-separated forwarding chain.
  return value && isIP(value) ? value : "unattributed";
}

/**
 * Shared database-backed fixed-window rate limit. A keyed digest keeps source
 * IPs and login identifiers out of the counter table. Atomic upsert keeps
 * concurrent server instances from each granting their own allowance.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const db = await getDb();
  const digestSecret = process.env.TAPPD_RATE_LIMIT_SECRET || databaseUrl() || "tappd-local-rate-limit";
  const digest = createHmac("sha256", digestSecret).update(key).digest("hex");
  const now = new Date();
  const nextReset = new Date(now.getTime() + windowMs);
  const [counter] = await db
    .insert(rateLimits)
    .values({ key: digest, count: 1, resetAt: nextReset })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.resetAt} <= now() then 1 else ${rateLimits.count} + 1 end`,
        resetAt: sql`case when ${rateLimits.resetAt} <= now() then now() + (${windowMs} * interval '1 millisecond') else ${rateLimits.resetAt} end`,
      },
    })
    .returning({ count: rateLimits.count });

  // Opportunistically reap expired, hashed keys without adding a second query
  // to every request. The index bounds the cleanup scan.
  if (Math.random() < 0.02) {
    await db.delete(rateLimits).where(lt(rateLimits.resetAt, new Date(now.getTime() - 24 * 60 * 60 * 1000)));
  }

  return (counter?.count ?? limit + 1) <= limit;
}

export function absoluteUrl(request: Request, path: string): string {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    throw new Error("Public URL paths must be root-relative.");
  }
  const configured = configuredPublicOrigin();
  if (configured) return new URL(path, configured).toString();
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?$/i.test(host);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const proto = forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : isLocal ? "http" : "https";
  return new URL(path, `${proto}://${host}`).toString();
}
