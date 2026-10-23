import type { Card } from "@/db/schema";
import { normalizeUrl } from "./utils";

function escapeValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function splitName(displayName: string): { first: string; last: string } {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

export function buildVCard(card: Card): string {
  const { first, last } = splitName(card.displayName);
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeValue(last)};${escapeValue(first)};;;`,
    `FN:${escapeValue(card.displayName)}`,
  ];

  if (card.company) lines.push(`ORG:${escapeValue(card.company)}`);
  if (card.headline) lines.push(`TITLE:${escapeValue(card.headline)}`);
  if (card.phone) lines.push(`TEL;TYPE=CELL:${escapeValue(card.phone)}`);
  if (card.email) lines.push(`EMAIL;TYPE=WORK:${escapeValue(card.email)}`);
  if (card.website) lines.push(`URL:${escapeValue(normalizeUrl(card.website))}`);
  if (card.location) lines.push(`ADR;TYPE=WORK:;;;${escapeValue(card.location)};;;`);

  const socials: Array<[string, string | null]> = [
    ["linkedin", card.linkedin],
    ["twitter", card.twitter],
    ["github", card.github],
    ["instagram", card.instagram],
  ];
  for (const [network, value] of socials) {
    if (value) lines.push(`X-SOCIALPROFILE;TYPE=${network}:${escapeValue(normalizeUrl(value))}`);
  }
  for (const link of card.links ?? []) {
    lines.push(`URL;TYPE=${escapeValue(link.label)}:${escapeValue(normalizeUrl(link.url))}`);
  }

  const note = [card.bio, card.tags?.length ? `Tags: ${card.tags.join(", ")}` : null]
    .filter(Boolean)
    .join("\n\n");
  if (note) lines.push(`NOTE:${escapeValue(note)}`);

  lines.push(`REV:${new Date(card.updatedAt).toISOString()}`);
  lines.push("END:VCARD");
  return `${lines.join("\r\n")}\r\n`;
}

export function vcardFileName(card: Card): string {
  const safe = card.displayName.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${safe || "contact"}.vcf`;
}
