import assert from "node:assert/strict";
import test from "node:test";
import { isShareCancellation } from "@/lib/share";

test("share cancellation is recognized by the AbortError name", () => {
  assert.equal(isShareCancellation(new DOMException("Share dismissed", "AbortError")), true);
  assert.equal(isShareCancellation({ name: "AbortError" }), true);
});

test("other share failures and non-error values are not treated as cancellations", () => {
  assert.equal(isShareCancellation(new Error("Share unavailable")), false);
  assert.equal(isShareCancellation({ name: "NotAllowedError" }), false);
  assert.equal(isShareCancellation(null), false);
  assert.equal(isShareCancellation("AbortError"), false);
});
