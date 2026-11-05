import assert from "node:assert/strict";
import test from "node:test";
import { appendBioStarter, formatSpecialty, specialtySuggestions } from "@/lib/profile-writing";

test("specialty suggestions respond to the role and omit specialties already chosen", () => {
  assert.deepEqual(
    specialtySuggestions("Product Designer", ["design-systems"], 4),
    ["user research", "prototyping", "onboarding", "accessibility"],
  );
});

test("specialty suggestions stay empty for an unknown role instead of inventing expertise", () => {
  assert.deepEqual(specialtySuggestions("Community gardener", []), []);
});

test("bio starters append on a new line without overwriting what the member wrote", () => {
  assert.equal(appendBioStarter("I help small teams.", "Ask me about [a topic]."), "I help small teams.\nAsk me about [a topic].");
  assert.equal(appendBioStarter("  ", "I help [people]."), "I help [people].");
});

test("specialties render as readable phrases, preserving common acronyms", () => {
  assert.equal(formatSpecialty("design-systems"), "Design Systems");
  assert.equal(formatSpecialty("ux-ui"), "UX UI");
});
