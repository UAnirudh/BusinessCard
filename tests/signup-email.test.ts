import assert from "node:assert/strict";
import test from "node:test";
import { EmailNotConfiguredError, sendSignupVerificationEmail } from "@/lib/email";

test("signup verification email sends the one-time link through the configured provider", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.TAPPD_EMAIL_FROM;
  let captured: { url: string; init?: RequestInit } | undefined;
  process.env.RESEND_API_KEY = "test-api-key";
  process.env.TAPPD_EMAIL_FROM = "Tappd <verify@example.test>";
  globalThis.fetch = async (input, init) => {
    captured = { url: String(input), init };
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    await sendSignupVerificationEmail("person@example.test", "https://tappd.example.test/verify-email?token=opaque", "signup-verification/digest");
    assert.equal(captured?.url, "https://api.resend.com/emails");
    assert.equal(new Headers(captured?.init?.headers).get("authorization"), "Bearer test-api-key");
    assert.equal(new Headers(captured?.init?.headers).get("idempotency-key"), "signup-verification/digest");
    const body = JSON.parse(String(captured?.init?.body)) as { from: string; to: string[]; subject: string; text: string };
    assert.equal(body.from, "Tappd <verify@example.test>");
    assert.deepEqual(body.to, ["person@example.test"]);
    assert.equal(body.subject, "Verify your Tappd email");
    assert.match(body.text, /https:\/\/tappd\.example\.test\/verify-email\?token=opaque/);
    assert.match(body.text, /expires in 24 hours/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.TAPPD_EMAIL_FROM;
    else process.env.TAPPD_EMAIL_FROM = originalFrom;
  }
});

test("signup verification email refuses to send without configured delivery", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.TAPPD_EMAIL_FROM;
  let requested = false;
  delete process.env.RESEND_API_KEY;
  delete process.env.TAPPD_EMAIL_FROM;
  globalThis.fetch = async () => {
    requested = true;
    return new Response("{}", { status: 200 });
  };

  try {
    await assert.rejects(
      sendSignupVerificationEmail("person@example.test", "https://tappd.example.test/verify-email?token=opaque", "signup-verification/digest"),
      EmailNotConfiguredError,
    );
    assert.equal(requested, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.TAPPD_EMAIL_FROM;
    else process.env.TAPPD_EMAIL_FROM = originalFrom;
  }
});
