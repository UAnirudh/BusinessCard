import assert from "node:assert/strict";
import test from "node:test";
import {
  connectionNotesIssue,
  connectionNotesValue,
  MAX_CONNECTION_NOTES_LENGTH,
} from "../mobile/src/connection-notes";

test("connection note values trim whitespace and clear empty notes", () => {
  assert.equal(connectionNotesValue("  Met at the Seattle meetup.\nFollow up next week.  "), "Met at the Seattle meetup.\nFollow up next week.");
  assert.equal(connectionNotesValue(" \n  "), null);
  assert.equal(connectionNotesIssue("\n\t"), null);
});

test("connection notes match the server's 2,000-character limit", () => {
  assert.equal(connectionNotesIssue("n".repeat(MAX_CONNECTION_NOTES_LENGTH)), null);
  assert.match(connectionNotesIssue("n".repeat(MAX_CONNECTION_NOTES_LENGTH + 1)) ?? "", /2,000 characters/);
});
