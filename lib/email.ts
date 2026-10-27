export class EmailNotConfiguredError extends Error {
  constructor() {
    super("Transactional email is not configured.");
    this.name = "EmailNotConfiguredError";
  }
}

export function emailDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.TAPPD_EMAIL_FROM?.trim());
}

export const passwordResetEmailConfigured = emailDeliveryConfigured;

async function sendTransactionalEmail(to: string, subject: string, text: string, idempotencyKey: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.TAPPD_EMAIL_FROM?.trim();
  if (!apiKey || !from) throw new EmailNotConfiguredError();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify({ from, to: [to], subject, text }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Email provider returned HTTP ${response.status}`);
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string, idempotencyKey: string) {
  await sendTransactionalEmail(
    to,
    "Reset your Tappd password",
    [
      "We received a request to reset the password for your Tappd account.",
      "",
      `Reset your password: ${resetUrl}`,
      "",
      "This link expires in 60 minutes and can only be used once. If you did not request this, you can ignore this email; your password will not change.",
      "",
      "Tappd Support",
    ].join("\n"),
    idempotencyKey,
  );
}

export async function sendAccountEmailChangeEmail(to: string, confirmUrl: string, idempotencyKey: string) {
  await sendTransactionalEmail(
    to,
    "Confirm your new Tappd email",
    [
      "We received a request to change the sign-in email for your Tappd account.",
      "",
      `Confirm your new email address: ${confirmUrl}`,
      "",
      "This link expires in 60 minutes and can only be used once. Your account email will not change until you confirm it.",
      "If you did not request this, you can ignore this message.",
      "",
      "Tappd Support",
    ].join("\n"),
    idempotencyKey,
  );
}

export async function sendSignupVerificationEmail(to: string, verifyUrl: string, idempotencyKey: string) {
  await sendTransactionalEmail(
    to,
    "Verify your Tappd email",
    [
      "We received a request to create a Tappd account with this email address.",
      "",
      `Verify your email and finish creating your account: ${verifyUrl}`,
      "",
      "This link expires in 24 hours and can only be used once. You will choose your password after opening the link. If you did not request this, you can ignore this email.",
      "",
      "Tappd Support",
    ].join("\n"),
    idempotencyKey,
  );
}
