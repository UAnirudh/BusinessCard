/** Normalize compatibility characters and invisible format controls before checks. */
export function normalizePublicText(value: string): string {
  return value.normalize("NFKC").replace(/[\p{Cf}\u200B-\u200D\uFEFF]/gu, "").toLowerCase();
}
