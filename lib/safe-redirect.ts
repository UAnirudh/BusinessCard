const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

/** Return only a same-origin, root-relative path suitable for post-auth navigation. */
export function safeRedirectPath(value: string | undefined, fallback: string): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    CONTROL_CHARACTERS.test(value)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://tappd.invalid");
    return parsed.origin === "https://tappd.invalid" ? value : fallback;
  } catch {
    return fallback;
  }
}
