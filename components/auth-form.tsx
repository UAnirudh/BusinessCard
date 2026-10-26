"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";

export function AuthForm({ mode, redirectTo }: { mode: "login" | "signup"; redirectTo: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSignup = mode === "signup";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);

    try {
      const response = await fetch(isSignup ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(isSignup ? { name, email, password } : { email, password }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        setPending(false);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
      {isSignup && (
        <div>
          <label htmlFor="name" className="label">Full name</label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="input"
            placeholder="Maya Chen"
          />
        </div>
      )}

      <div>
        <label htmlFor="email" className="label">Work email</label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="input"
          placeholder="you@company.com"
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="password" className="label">Password</label>
          {isSignup && <span className="hint">8+ characters</span>}
        </div>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input pr-11"
            placeholder={isSignup ? "Create a password" : "Your password"}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-faint transition hover:bg-[#f5f3ed] hover:text-ink"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-[#f0d5c7] bg-[#fff7f2] px-3 py-2.5 text-[0.82rem] leading-relaxed text-danger" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full !py-3" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 spin" />
            {isSignup ? "Creating your card…" : "Signing in…"}
          </>
        ) : (
          <>
            {isSignup ? "Create my card" : "Log in"}
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="pt-1 text-center text-[0.82rem] text-muted">
        {isSignup ? (
          <>
            Already have a card?{" "}
            <Link href="/login" className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
              Log in
            </Link>
          </>
        ) : (
          <>
            New to Tappd?{" "}
            <Link href="/signup" className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
              Create your card
            </Link>
          </>
        )}
      </p>
      <p className="text-center text-[0.72rem] leading-relaxed text-faint">
        Your details are handled as described in our{" "}
        <Link href="/privacy" className="font-medium text-muted underline underline-offset-2 hover:text-ink">
          Privacy Policy
        </Link>.
      </p>
    </form>
  );
}
