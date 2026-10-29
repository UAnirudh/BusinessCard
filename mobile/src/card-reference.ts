const CARD_SLUG = /^[A-Za-z0-9_-]+$/;

/** Accept a Tappd slug or a card URL on this app's configured service. */
export function parseCardReference(value: string, serviceOrigin: string): string | null {
  const input = value.trim();
  if (CARD_SLUG.test(input)) return input;
  if (!serviceOrigin) return null;

  try {
    const url = new URL(input);
    const origin = new URL(serviceOrigin);
    if (url.origin !== origin.origin || url.username || url.password || url.search || url.hash) return null;
    return url.pathname.match(/^\/c\/([A-Za-z0-9_-]+)\/?$/)?.[1] ?? null;
  } catch {
    return null;
  }
}
