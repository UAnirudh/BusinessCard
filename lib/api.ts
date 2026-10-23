import { NextResponse } from "next/server";
import type { z } from "zod";

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
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "local";
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Best-effort in-memory rate limiting (per server instance). */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) {
        if (v.resetAt < now) buckets.delete(k);
      }
    }
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function absoluteUrl(request: Request, path: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return `${configured}${path}`;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${path}`;
}
