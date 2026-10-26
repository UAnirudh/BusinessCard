import { headers } from "next/headers";
import { configuredPublicOrigin } from "@/lib/public-origin";

/** Resolves the public origin from config or the incoming request. */
export async function getOrigin(): Promise<string> {
  const configured = configuredPublicOrigin();
  if (configured) return configured;

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?$/i.test(host);
  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const proto = forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : isLocal ? "http" : "https";
  const origin = new URL(`${proto}://${host}`).origin;
  return origin;
}
