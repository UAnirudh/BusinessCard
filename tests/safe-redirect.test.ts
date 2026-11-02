import assert from "node:assert/strict";
import test from "node:test";
import { safeRedirectPath } from "../lib/safe-redirect";

test("accepts root-relative paths, queries, and fragments", () => {
  assert.equal(safeRedirectPath("/app/card", "/app"), "/app/card");
  assert.equal(safeRedirectPath("/c/maya-chen?source=share#contact", "/app"), "/c/maya-chen?source=share#contact");
});

test("falls back for external and protocol-relative URLs", () => {
  for (const value of ["https://attacker.example", "//attacker.example", "///attacker.example"]) {
    assert.equal(safeRedirectPath(value, "/app"), "/app", value);
  }
});

test("falls back for backslashes and control characters", () => {
  for (const value of ["\\\\attacker.example", "/\\\\attacker.example", "/app\r\nLocation: https://attacker.example"]) {
    assert.equal(safeRedirectPath(value, "/app"), "/app", value);
  }
});

test("uses the caller's page-specific fallback for missing or relative values", () => {
  assert.equal(safeRedirectPath(undefined, "/app/card"), "/app/card");
  assert.equal(safeRedirectPath("app/card", "/app/card"), "/app/card");
});
