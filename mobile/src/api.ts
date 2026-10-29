import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "tappd.native.session.v1";
const API_ORIGIN = (process.env.EXPO_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");
const API_TIMEOUT_MS = 20_000;

export type NativeUser = { id: string; name: string; email: string; termsAcceptedAt: string | null; termsVersion: string | null; currentTermsVersion: string };
export type BusinessCard = {
  id: string;
  slug: string;
  displayName: string;
  headline: string | null;
  company: string | null;
  bio: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  linkedin: string | null;
  twitter: string | null;
  github: string | null;
  instagram: string | null;
  accent: string;
  tags: string[];
  isPublic: boolean;
  collectLeads: boolean;
};
export type WalletContact = {
  id: string;
  name: string;
  headline: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  location: string | null;
  notes: string | null;
  tags: string[];
  favorite: boolean;
  followUpDate: string | null;
  source: string;
  updatedAt: string;
};

export type NativeSession = {
  ok: true;
  token: string;
  expiresAt: string;
  user: NativeUser;
  card: BusinessCard;
};

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiConfigured() {
  return Boolean(API_ORIGIN);
}

export function publicCardUrl(card: BusinessCard) {
  return `${API_ORIGIN}/c/${encodeURIComponent(card.slug)}`;
}

export function walletPassUrl(card: BusinessCard, provider: "apple" | "google") {
  return `${API_ORIGIN}/api/wallet/${provider}/${encodeURIComponent(card.slug)}`;
}

export function privacyUrl() {
  return `${API_ORIGIN}/privacy`;
}

export function termsUrl() {
  return `${API_ORIGIN}/terms`;
}

export function supportUrl() {
  return API_ORIGIN ? `${API_ORIGIN}/support` : "";
}

export function passwordResetUrl() {
  return `${API_ORIGIN}/forgot-password`;
}

export function cardSettingsUrl() {
  return `${API_ORIGIN}/app/card`;
}

export async function saveToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function loadToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function apiRequest<T>(
  path: string,
  options: { token?: string | null; method?: string; body?: unknown } = {},
): Promise<T> {
  if (!API_ORIGIN) {
    throw new Error("This build is missing EXPO_PUBLIC_API_URL. Connect the Tappd service before signing in.");
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_ORIGIN}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    let payload: Record<string, unknown> = {};
    if (contentType.includes("application/json")) {
      try {
        payload = await response.json();
      } catch (error) {
        if (controller.signal.aborted) throw error;
      }
    }
    if (!response.ok) {
      const message = typeof payload.error === "string" ? payload.error : "Something went wrong. Try again.";
      throw new ApiError(response.status, message);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) {
      throw new Error("Tappd took too long to respond. Check your connection and try again.");
    }
    throw new Error("Couldn’t reach Tappd. Check your connection and try again.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function deleteAccount(token: string, currentPassword: string) {
  return apiRequest<{ ok: true; deleted: true }>("/api/account", {
    method: "DELETE",
    token,
    body: { agreedToDelete: true, currentPassword },
  });
}
