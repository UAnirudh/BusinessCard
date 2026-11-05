export const AUTH_RETURN_SCHEME = "followfolk:";

export function isVerificationReturnUrl(url: string | null | undefined): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === AUTH_RETURN_SCHEME && parsed.hostname === "auth" && parsed.pathname === "/verified";
  } catch {
    return false;
  }
}
