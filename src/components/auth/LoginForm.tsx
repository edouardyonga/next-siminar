'use client';

import { FormEvent, useState } from "react";
import { useAuth } from "./AuthProvider";

export function LoginForm() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailPattern.test(email.trim()) && password.trim().length > 0;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Email and password are required.");
      return;
    }
    if (!emailPattern.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setSubmitting(true);
    const res = await login(trimmedEmail, trimmedPassword);
    setSubmitting(false);
    if (!res.ok) setError(res.message ?? "Login failed");
  };

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <div>
        <p className="text-xs uppercase tracking-wide text-indigo-700">Seminar OS</p>
        <h1 className="text-2xl font-semibold text-zinc-900">Sign in</h1>
        <p className="text-sm text-zinc-600">Use your admin credentials to continue.</p>
      </div>

      <label className="block space-y-1 text-sm text-zinc-700">
        Email
        <input
          type="email"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </label>

      <label className="block space-y-1 text-sm text-zinc-700">
        Password
        <input
          type="password"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        disabled={submitting || !isValid}
      >
        {submitting ? "Signing in..." : "Sign in"}
      </button>

      {loading ? (
        <p className="text-xs text-zinc-500">Checking session...</p>
      ) : (
        <p className="text-xs text-zinc-500">Admin only access</p>
      )}
    </form>
  );
}


