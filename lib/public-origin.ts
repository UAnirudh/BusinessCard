/**
 * Returns the explicitly configured public origin and rejects ambiguous URLs.
 * Production links must never be derived from a request's Host header.
 */
export function configuredPublicOrigin(): string | undefined {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_APP_URL must be set to the canonical HTTPS app origin in production.");
    }
    return undefined;
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("NEXT_PUBLIC_APP_URL must be a valid absolute URL.");
  }

  if (
    (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:")) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("NEXT_PUBLIC_APP_URL must contain only the public origin and use HTTPS in production.");
  }

  return url.origin;
}
