import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@/db/schema";
import { buildVCard } from "@/lib/vcard";

test("vCard escapes every newline form so profile text cannot inject contact properties", () => {
  const now = new Date("2026-10-28T00:00:00.000Z");
  const card = {
    displayName: "Maya Chen\r\nTEL;TYPE=CELL:+15555550100",
    headline: "Designer\rTitle: Injected\nROLE: Injected",
    company: null,
    bio: null,
    location: null,
    email: null,
    phone: null,
    website: null,
    linkedin: null,
    twitter: null,
    github: null,
    instagram: null,
    tags: [],
    links: [],
    updatedAt: now,
  } as unknown as Card;

  const vcard = buildVCard(card);
  assert.match(vcard, /FN:Maya Chen\\nTEL\\;TYPE=CELL:\+15555550100\r\n/);
  assert.match(vcard, /TITLE:Designer\\nTitle: Injected\\nROLE: Injected\r\n/);
  assert.doesNotMatch(vcard, /(?:^|\r\n)(?:TEL|Title|ROLE): Injected/m);
});
