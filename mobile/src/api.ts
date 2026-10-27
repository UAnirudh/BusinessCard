import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "tappd.native.session.v1";
const API_ORIGIN = (process.env.EXPO_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");

export type NativeUser = { id: string; name: string; email: string };
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

export function privacyUrl() {
  return `${API_ORIGIN}/privacy`;
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

  let response: Response;
  try {
    response = await fetch(`${API_ORIGIN}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new Error("Couldn’t reach Tappd. Check your connection and try again.");
  }

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : {};
  if (!response.ok) {
    const message = typeof payload.error === "string" ? payload.error : "Something went wrong. Try again.";
    throw new ApiError(response.status, message);
  }
  return payload as T;
}

export async function deleteAccount(token: string, currentPassword: string) {
  return apiRequest<{ ok: true; deleted: true }>("/api/account", {
    method: "DELETE",
    token,
    body: { agreedToDelete: true, currentPassword },
  });
}
