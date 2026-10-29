import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { appleWalletSigningMaterialIsValid, googleWalletServiceAccountIsValid, isOpenSslAvailable, walletAvailability } from "@/lib/wallet";

// These are public self-signed fixtures and test-only private keys, not Apple credentials.
const VALID_CERT = "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJ6ekNDQVhhZ0F3SUJBZ0lVUkpuR1huREF1R2dRT282VlB4QUROT0xNMVVJd0NnWUlLb1pJemowRUF3SXcKWHpFbk1DVUdBMVVFQXd3ZVZHRndjR1FnZDJGc2JHVjBJSEpsWVdScGJtVnpjeUJtYVhoMGRYSmxNUkV3RHdZRApWUVFMREFoVVJVRk5WRVZUVkRFaE1COEdDZ21TSm9tVDhpeGtBUUVNRVhCaGMzTXVaWGhoYlhCc1pTNTBaWE4wCk1CNFhEVEl3TURFd01UQXdNREF3TUZvWERUUXdNREV3TVRBd01EQXdNRm93WHpFbk1DVUdBMVVFQXd3ZVZHRncKY0dRZ2QyRnNiR1YwSUhKbFlXUnBibVZ6Y3lCbWFYaDBkWEpsTVJFd0R3WURWUVFMREFoVVJVRk5WRVZUVkRFaApNQjhHQ2dtU0pvbVQ4aXhrQVFFTUVYQmhjM011WlhoaGJYQnNaUzUwWlhOME1Ga3dFd1lIS29aSXpqMENBUVlJCktvWkl6ajBEQVFjRFFnQUVaajFUUDUxUklEK1NjYUEwWlhZZ3BZQjNYemNSd1JSRWdYN2dNeUtucXJ2MlV5Tm8KR2tVZnVTa29yLzNBYm9ndXF6cUYrMWZlVjR4OHg5dWxJSUhPRktNUU1BNHdEQVlEVlIwVEFRSC9CQUl3QURBSwpCZ2dxaGtqT1BRUURBZ05IQURCRUFpQlp6ZVRKSjBoRUVBcUhUd3ppZDN6dllhTGEwQnZjT2ZwM1RreXFmNUdyClhnSWdUNVdKWmZDL2RpOGFNSHNQM0FJNE1FSlBhb0FGQnlUR0xBWlNPaTdvNVlZPQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==";
const EXPIRED_CERT = "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUIwRENDQVhhZ0F3SUJBZ0lVR3I0RjBEUnZYaEY3OGlqOXp1b05VUlk3L29jd0NnWUlLb1pJemowRUF3SXcKWHpFbk1DVUdBMVVFQXd3ZVZHRndjR1FnZDJGc2JHVjBJSEpsWVdScGJtVnpjeUJtYVhoMGRYSmxNUkV3RHdZRApWUVFMREFoVVJVRk5WRVZUVkRFaE1COEdDZ21TSm9tVDhpeGtBUUVNRVhCaGMzTXVaWGhoYlhCc1pTNTBaWE4wCk1CNFhEVEl3TURFd01UQXdNREF3TUZvWERUSXhNREV3TVRBd01EQXdNRm93WHpFbk1DVUdBMVVFQXd3ZVZHRncKY0dRZ2QyRnNiR1YwSUhKbFlXUnBibVZ6Y3lCbWFYaDBkWEpsTVJFd0R3WURWUVFMREFoVVJVRk5WRVZUVkRFaApNQjhHQ2dtU0pvbVQ4aXhrQVFFTUVYQmhjM011WlhoaGJYQnNaUzUwWlhOME1Ga3dFd1lIS29aSXpqMENBUVlJCktvWkl6ajBEQVFjRFFnQUVaajFUUDUxUklEK1NjYUEwWlhZZ3BZQjNYemNSd1JSRWdYN2dNeUtucXJ2MlV5Tm8KR2tVZnVTa29yLzNBYm9ndXF6cUYrMWZlVjR4OHg5dWxJSUhPRktNUU1BNHdEQVlEVlIwVEFRSC9CQUl3QURBSwpCZ2dxaGtqT1BRUURBZ05JQURCRkFpRUF3SmxBekg3b1ZYK0R2T2RJMjYzV0xGaGUzOTRmZWJTN2xsR2x6bldtCk9LMENJRTVWVnozc0xiREQ0QnJmU29LTU5SU0NZU0NrTjFHc2lCTENHazF4MkNkYgotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==";
const PASS_MISMATCH_CERT = "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUIwekNDQVhxZ0F3SUJBZ0lVSlIvS01JR3NOSDlzWEhvbHlZeEM3MmNXcjVRd0NnWUlLb1pJemowRUF3SXcKWVRFbk1DVUdBMVVFQXd3ZVZHRndjR1FnZDJGc2JHVjBJSEpsWVdScGJtVnpjeUJtYVhoMGRYSmxNUkV3RHdZRApWUVFMREFoVVJVRk5WRVZUVkRFak1DRUdDZ21TSm9tVDhpeGtBUUVNRTNCaGMzTXVaR2xtWm1WeVpXNTBMblJsCmMzUXdIaGNOTWpBd01UQXhNREF3TURBd1doY05OREF3TVRBeE1EQXdNREF3V2pCaE1TY3dKUVlEVlFRRERCNVUKWVhCd1pDQjNZV3hzWlhRZ2NtVmhaR2x1WlhOeklHWnBlSFIxY21VeEVUQVBCZ05WQkFzTUNGUkZRVTFVUlZOVQpNU013SVFZS0NaSW1pWlB5TEdRQkFRd1RjR0Z6Y3k1a2FXWm1aWEpsYm5RdWRHVnpkREJaTUJNR0J5cUdTTTQ5CkFnRUdDQ3FHU000OUF3RUhBMElBQkdZOVV6K2RVU0Eva25HZ05HVjJJS1dBZDE4M0VjRVVSSUYrNERNaXA2cTcKOWxNamFCcEZIN2twS0svOXdHNklMcXM2aGZ0WDNsZU1mTWZicFNDQnpoU2pFREFPTUF3R0ExVWRFd0VCL3dRQwpNQUF3Q2dZSUtvWkl6ajBFQXdJRFJ3QXdSQUlnZEExQmRCaFByVUNuRzBPRDJ2VTFHRGVkNUxCaElXNUZsb1FFCjY3RUFZSHNDSUY3QlhERStnbDFCSlpZWVg1TTgzV09CTGo0WHhqS3JzQ0M0YkhJbHU0MjkKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=";
const TEAM_MISMATCH_CERT = "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUIwekNDQVhpZ0F3SUJBZ0lVT3RHZjByT3V3T1FYMmpDdmRYd0ZjWGY2d1Rrd0NnWUlLb1pJemowRUF3SXcKWURFbk1DVUdBMVVFQXd3ZVZHRndjR1FnZDJGc2JHVjBJSEpsWVdScGJtVnpjeUJtYVhoMGRYSmxNUkl3RUFZRApWUVFMREFsUFZFaEZVbFJGUVUweElUQWZCZ29Ka2lhSmsvSXNaQUVCREJGd1lYTnpMbVY0WVcxd2JHVXVkR1Z6CmREQWVGdzB5TURBeE1ERXdNREF3TURCYUZ3MDBNREF4TURFd01EQXdNREJhTUdBeEp6QWxCZ05WQkFNTUhsUmgKY0hCa0lIZGhiR3hsZENCeVpXRmthVzVsYzNNZ1ptbDRkSFZ5WlRFU01CQUdBMVVFQ3d3SlQxUklSVkpVUlVGTgpNU0V3SHdZS0NaSW1pWlB5TEdRQkFRd1JjR0Z6Y3k1bGVHRnRjR3hsTG5SbGMzUXdXVEFUQmdjcWhrak9QUUlCCkJnZ3Foa2pPUFFNQkJ3TkNBQVJtUFZNL25WRWdQNUp4b0RSbGRpQ2xnSGRmTnhIQkZFU0JmdUF6SXFlcXUvWlQKSTJnYVJSKzVLU2l2L2NCdWlDNnJPb1g3Vjk1WGpIekgyNlVnZ2M0VW94QXdEakFNQmdOVkhSTUJBZjhFQWpBQQpNQW9HQ0NxR1NNNDlCQU1DQTBrQU1FWUNJUUNqVUdMdDloY3pzOXRSS0xBVStiY0JycXVJdGdRREU2UGVwSFU3Cnd6elpKUUloQUowOFpDVkdUNEZOV3VFYk9uVFpqazczUHdFaTE1QkltSi9QSnZ2UFBqSmgKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=";
const VALID_KEY = "LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR0hBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJHMHdhd0lCQVFRZ1pZVHNnOGYyTkVvMnJLcFgKcm5Ca1hDVGRZVmhKVVNUamJhV2tHQzVVYUxHaFJBTkNBQVJtUFZNL25WRWdQNUp4b0RSbGRpQ2xnSGRmTnhIQgpGRVNCZnVBeklxZXF1L1pUSTJnYVJSKzVLU2l2L2NCdWlDNnJPb1g3Vjk1WGpIekgyNlVnZ2M0VQotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tCg==";
const OTHER_KEY = "LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR0hBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJHMHdhd0lCQVFRZ3dUZWgxZnh2TjRlRHVwSGYKOGxuL1I2RWdoNENzVnNGeDVMeU9DNjRCYTN1aFJBTkNBQVRrOUlPY3N0VHZCZFZmd0Q4Y2pMOGFFc0NMQ3IxYwpuNndTOHl5MjdhZlRhNExVUkMxSDA4Sm54bitMN09HUitzTFJrVEFLMzRSYlRmQTFpL3AyVUhkYQotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tCg==";
const UNRELATED_WWDR_CERT = "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJ3akNDQVdtZ0F3SUJBZ0lVREFxVFk0TGo4NjI2RnROL3RMNVZVQTZQQ08wd0NnWUlLb1pJemowRUF3SXcKVnpFZk1CMEdBMVVFQXd3V1ZXNXlaV3hoZEdWa0lGZFhSRklnWm1sNGRIVnlaVEVSTUE4R0ExVUVDd3dJVkVWQgpUVlJGVTFReElUQWZCZ29Ka2lhSmsvSXNaQUVCREJGd1lYTnpMbVY0WVcxd2JHVXVkR1Z6ZERBZUZ3MHlNREF4Ck1ERXdNREF3TURCYUZ3MDBNREF4TURFd01EQXdNREJhTUZjeEh6QWRCZ05WQkFNTUZsVnVjbVZzWVhSbFpDQlgKVjBSU0lHWnBlSFIxY21VeEVUQVBCZ05WQkFzTUNGUkZRVTFVUlZOVU1TRXdId1lLQ1pJbWlaUHlMR1FCQVF3UgpjR0Z6Y3k1bGVHRnRjR3hsTG5SbGMzUXdXVEFUQmdjcWhrak9QUUlCQmdncWhrak9QUU1CQndOQ0FBVGs5SU9jCnN0VHZCZFZmd0Q4Y2pMOGFFc0NMQ3IxY242d1M4eXkyN2FmVGE0TFVSQzFIMDhKbnhuK0w3T0dSK3NMUmtUQUsKMzRSYlRmQTFpL3AyVUhkYW94TXdFVEFQQmdOVkhSTUJBZjhFQlRBREFRSC9NQW9HQ0NxR1NNNDlCQU1DQTBjQQpNRVFDSUNCWHFMRWZrUlJ6TU5BVmczK054UktGOWpYOHJUemhQYndQWnZGTVBMQy9BaUFnRXNTNlNVdEt1UUZyCjBySTJYdUN3UzhVeWJNZmp1WTlBa1dtVEQ0RnM1Zz09Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K";
const NOW = Date.UTC(2026, 10, 27);
const googleRsaKey = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
const GOOGLE_SERVICE_ACCOUNT = {
  type: "service_account",
  project_id: "tappd-wallet-test",
  private_key_id: "0123456789abcdef0123456789abcdef01234567",
  private_key: googleRsaKey.export({ format: "pem", type: "pkcs8" }).toString(),
  client_email: "wallet-test@tappd-wallet-test.iam.gserviceaccount.com",
};
const encodeGoogleCredentials = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64");

const material = (overrides: Partial<Parameters<typeof appleWalletSigningMaterialIsValid>[0]> = {}) => ({
  signerCertificate: VALID_CERT,
  signerPrivateKey: VALID_KEY,
  wwdrCertificate: VALID_CERT,
  passTypeIdentifier: "pass.example.test",
  teamIdentifier: "TEAMTEST",
  now: NOW,
  ...overrides,
});

test("Apple readiness accepts parseable, matching, currently valid signer and WWDR certificates", () => {
  assert.equal(appleWalletSigningMaterialIsValid(material()), true);
});

test("Apple readiness rejects malformed certificate or private-key material", () => {
  assert.equal(appleWalletSigningMaterialIsValid(material({ signerCertificate: "bm90LWEtY2VydA==" })), false);
  assert.equal(appleWalletSigningMaterialIsValid(material({ signerPrivateKey: "bm90LWEtcHJpdmF0ZS1rZXk=" })), false);
  assert.equal(appleWalletSigningMaterialIsValid(material({ wwdrCertificate: "bm90LWEtY2VydA==" })), false);
});

test("Apple readiness rejects a valid but unrelated WWDR certificate", () => {
  assert.equal(appleWalletSigningMaterialIsValid(material({ wwdrCertificate: UNRELATED_WWDR_CERT })), false);
});

test("Apple readiness rejects a signer certificate with a different Pass Type ID", () => {
  assert.equal(appleWalletSigningMaterialIsValid(material({ signerCertificate: PASS_MISMATCH_CERT })), false);
});

test("Apple readiness rejects a signer certificate with a different Team ID", () => {
  assert.equal(appleWalletSigningMaterialIsValid(material({ signerCertificate: TEAM_MISMATCH_CERT })), false);
});

test("Apple readiness rejects a signer certificate and private key that do not match", () => {
  assert.equal(appleWalletSigningMaterialIsValid(material({ signerPrivateKey: OTHER_KEY })), false);
});

test("Apple readiness rejects expired signer and WWDR certificates", () => {
  assert.equal(appleWalletSigningMaterialIsValid(material({ signerCertificate: EXPIRED_CERT })), false);
  assert.equal(appleWalletSigningMaterialIsValid(material({ wwdrCertificate: EXPIRED_CERT })), false);
});

test("Apple readiness rejects a missing or non-runnable OpenSSL binary", async () => {
  assert.equal(await isOpenSslAvailable("tappd-openssl-binary-that-does-not-exist"), false);
});

test("Google readiness accepts a structurally valid service account with an RSA signing key", () => {
  assert.equal(googleWalletServiceAccountIsValid(encodeGoogleCredentials(GOOGLE_SERVICE_ACCOUNT)), true);
});

test("Google readiness rejects malformed JSON and malformed private keys", () => {
  assert.equal(googleWalletServiceAccountIsValid(Buffer.from("not-json").toString("base64")), false);
  assert.equal(googleWalletServiceAccountIsValid(encodeGoogleCredentials({ ...GOOGLE_SERVICE_ACCOUNT, private_key: "not-a-key" })), false);
});

test("Google readiness rejects non-RSA keys and incomplete identity fields", () => {
  const ecKey = Buffer.from(VALID_KEY, "base64").toString("utf8");
  assert.equal(googleWalletServiceAccountIsValid(encodeGoogleCredentials({ ...GOOGLE_SERVICE_ACCOUNT, private_key: ecKey })), false);
  assert.equal(googleWalletServiceAccountIsValid(encodeGoogleCredentials({ ...GOOGLE_SERVICE_ACCOUNT, client_email: "not-an-email" })), false);
  assert.equal(googleWalletServiceAccountIsValid(encodeGoogleCredentials({ ...GOOGLE_SERVICE_ACCOUNT, private_key_id: "" })), false);
});

test("wallet availability reflects locally valid Google credentials using boolean flags only", async () => {
  const names = ["GOOGLE_WALLET_ISSUER_ID", "GOOGLE_WALLET_CLASS_ID", "GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_BASE64", "APPLE_WALLET_PASS_TYPE_ID", "APPLE_WALLET_TEAM_ID"] as const;
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  Object.assign(process.env, {
    GOOGLE_WALLET_ISSUER_ID: "123456789",
    GOOGLE_WALLET_CLASS_ID: "123456789.tappd",
    GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_BASE64: encodeGoogleCredentials(GOOGLE_SERVICE_ACCOUNT),
  });
  delete process.env.APPLE_WALLET_PASS_TYPE_ID;
  delete process.env.APPLE_WALLET_TEAM_ID;
  try {
    const valid = await walletAvailability();
    assert.deepEqual(valid, { apple: false, google: true });
    process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_BASE64 = Buffer.from("not-json").toString("base64");
    const malformed = await walletAvailability();
    assert.deepEqual(malformed, { apple: false, google: false });
    assert.equal(Object.values(malformed).every((value) => typeof value === "boolean"), true);
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});

test("wallet availability exposes only boolean flags and fails Apple closed when OpenSSL is missing", async () => {
  const names = ["OPENSSL_BIN", "APPLE_WALLET_PASS_TYPE_ID", "APPLE_WALLET_TEAM_ID", "APPLE_WALLET_SIGNER_CERT_BASE64", "APPLE_WALLET_SIGNER_KEY_BASE64", "APPLE_WALLET_WWDR_CERT_BASE64", "APPLE_WALLET_SIGNER_KEY_PASSPHRASE"] as const;
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  Object.assign(process.env, {
    OPENSSL_BIN: "tappd-openssl-binary-that-does-not-exist",
    APPLE_WALLET_PASS_TYPE_ID: "pass.example.test",
    APPLE_WALLET_TEAM_ID: "TEAMTEST",
    APPLE_WALLET_SIGNER_CERT_BASE64: VALID_CERT,
    APPLE_WALLET_SIGNER_KEY_BASE64: VALID_KEY,
    APPLE_WALLET_WWDR_CERT_BASE64: VALID_CERT,
  });
  delete process.env.APPLE_WALLET_SIGNER_KEY_PASSPHRASE;
  try {
    const availability = await walletAvailability();
    assert.deepEqual(availability, { apple: false, google: false });
    assert.equal(Object.values(availability).every((value) => typeof value === "boolean"), true);
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});
