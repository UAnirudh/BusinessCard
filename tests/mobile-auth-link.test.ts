import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { AUTH_RETURN_SCHEME, isVerificationReturnUrl } from "../mobile/src/auth-link";

test("the Expo display scheme matches the email verification callback scheme", () => {
  const appConfig = JSON.parse(readFileSync("mobile/app.json", "utf8")) as { expo: { scheme: string } };
  assert.equal(`${appConfig.expo.scheme}:`, AUTH_RETURN_SCHEME);
});

test("accepts only the Followfolk email verification return link", () => {
  assert.equal(isVerificationReturnUrl("followfolk://auth/verified"), true);
  assert.equal(isVerificationReturnUrl("tappd://auth/verified"), false);
  assert.equal(isVerificationReturnUrl("https://example.com/auth/verified"), false);
  assert.equal(isVerificationReturnUrl("followfolk://other/verified"), false);
  assert.equal(isVerificationReturnUrl("followfolk://auth/other"), false);
  assert.equal(isVerificationReturnUrl("malformed"), false);
  assert.equal(isVerificationReturnUrl(null), false);
});
