export class EmailNotConfiguredError extends Error {
  constructor() {
    super("Password recovery email is not configured.");
    this.name = "EmailNotConfiguredError";
  }
}

export function passwordResetEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.TAPPD_EMAIL_FROM?.trim());
}

export async function sendPasswordResetEmail(to: string, resetUrl: string, idempotencyKey: string) {
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
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Reset your Tappd password",
        text: [
          "We received a request to reset the password for your Tappd account.",
          "",
          `Reset your password: ${resetUrl}`,
          "",
          "This link expires in 60 minutes and can only be used once. If you did not request this, you can ignore this email; your password will not change.",
          "",
          "Tappd Support",
        ].join("\n"),
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Email provider returned HTTP ${response.status}`);
  } finally {
    clearTimeout(timeout);
  }
}
