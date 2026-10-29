import assert from "node:assert/strict";
import test from "node:test";
import { cardProfileIssue, cardProfilePatch, type CardProfileDraft } from "../mobile/src/card-profile";

const validDraft: CardProfileDraft = {
  displayName: "  Alex Morgan  ",
  headline: "Product Designer",
  company: "Northwind",
  email: " alex@example.com ",
  phone: " +1 206 555 0100 ",
  website: " https://example.com ",
  location: " Seattle, WA ",
  bio: " Building thoughtful products. ",
};

test("native card profile patch trims fields and clears optional blanks", () => {
  const patch = cardProfilePatch({ ...validDraft, company: "  ", bio: "" });
  assert.deepEqual(patch, {
    displayName: "Alex Morgan",
    headline: "Product Designer",
    company: null,
    email: "alex@example.com",
    phone: "+1 206 555 0100",
    website: "https://example.com",
    location: "Seattle, WA",
    bio: null,
  });
  assert.equal(cardProfileIssue(patch), null);
});

test("native card profile requires a usable name and valid optional email", () => {
  assert.match(cardProfileIssue(cardProfilePatch({ ...validDraft, displayName: "A" })) ?? "", /at least 2/);
  assert.match(cardProfileIssue(cardProfilePatch({ ...validDraft, email: "alex-at-example" })) ?? "", /valid email/);
});

test("native card profile enforces field limits before submit", () => {
  assert.match(cardProfileIssue(cardProfilePatch({ ...validDraft, headline: "r".repeat(121) })) ?? "", /120 characters/);
  assert.match(cardProfileIssue(cardProfilePatch({ ...validDraft, bio: "b".repeat(501) })) ?? "", /500 characters/);
});
