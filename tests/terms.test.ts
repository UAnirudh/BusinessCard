import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@/db/schema";
import type { CardUpdateInput } from "@/lib/validation";
import { cardChangeRequiresTerms, CURRENT_TERMS_VERSION } from "@/lib/terms";

function card(isPublic: boolean): Card {
  const now = new Date("2026-10-28T00:00:00Z");
  return {
    id: "10000000-0000-4000-8000-000000000001",
    userId: "20000000-0000-4000-8000-000000000001",
    slug: "maya-chen",
    displayName: "Maya Chen",
    headline: "Designer",
    company: "Northwind",
    bio: null,
    location: null,
    email: "maya@example.test",
    phone: null,
    website: null,
    linkedin: null,
    twitter: null,
    github: null,
    instagram: null,
    accent: "lime",
    tags: [],
    links: [],
    isPublic,
    collectLeads: false,
    createdAt: now,
    updatedAt: now,
  };
}

function unchangedCardInput(value: Card): CardUpdateInput {
  return {
    displayName: value.displayName,
    headline: value.headline,
    company: value.company,
    bio: value.bio,
    location: value.location,
    email: value.email,
    phone: value.phone,
    website: value.website,
    linkedin: value.linkedin,
    twitter: value.twitter,
    github: value.github,
    instagram: value.instagram,
    accent: value.accent,
    tags: value.tags,
    links: value.links,
    isPublic: value.isPublic,
    collectLeads: value.collectLeads,
    slug: value.slug,
  };
}

test("new and existing members need explicit consent before adding or publishing card content", () => {
  const privateCard = card(false);
  const unchangedPrivate = unchangedCardInput(privateCard);
  assert.equal(cardChangeRequiresTerms(null, null, privateCard, { ...unchangedPrivate, displayName: "Maya C." }), true);
  assert.equal(cardChangeRequiresTerms(null, null, privateCard, { ...unchangedPrivate, isPublic: true }), true);
  assert.equal(cardChangeRequiresTerms(new Date(), CURRENT_TERMS_VERSION, privateCard, { ...unchangedPrivate, displayName: "Maya C." }), false);
  assert.equal(cardChangeRequiresTerms(new Date(), "2025-01-01", privateCard, { ...unchangedPrivate, displayName: "Maya C." }), true);
  assert.equal(CURRENT_TERMS_VERSION, "2026-10-28");
});

test("an existing unaccepted member can make a public card private without accepting new terms", () => {
  const publicCard = { ...card(true), collectLeads: true };
  assert.equal(cardChangeRequiresTerms(null, null, publicCard, { ...unchangedCardInput(publicCard), isPublic: false, collectLeads: false }), false);
  assert.equal(cardChangeRequiresTerms(null, null, publicCard, { ...unchangedCardInput(publicCard), isPublic: false, collectLeads: false, bio: "New content" }), true);
  assert.equal(cardChangeRequiresTerms(null, null, publicCard, { ...unchangedCardInput(publicCard), isPublic: false, bio: "New content" }), true);
});
