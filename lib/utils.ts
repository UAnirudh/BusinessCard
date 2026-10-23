export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const value = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - value.getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function longDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** Normalizes a user-entered URL into a full https URL, or null. */
export function normalizeUrl(input: string | null | undefined): string | null {
  const raw = input?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^mailto:|^tel:/i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, "")}`;
}

export function prettyUrl(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function plural(count: number, word: string, pluralWord?: string): string {
  return `${count} ${count === 1 ? word : pluralWord ?? `${word}s`}`;
}

export function splitList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
