'use client';

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "../security";

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function fetchCsrfToken() {
  const res = await fetch("/api/auth/csrf", { cache: "no-store" });
  if (!res.ok) throw new Error("Unable to obtain CSRF token");
  const body = (await res.json()) as { token?: string };
  return body.token ?? null;
}

export async function ensureCsrfToken(): Promise<string> {
  const fromCookie = readCookie(CSRF_COOKIE_NAME);
  if (fromCookie) return fromCookie;

  const token = await fetchCsrfToken();
  if (token) return token;

  const fallback = readCookie(CSRF_COOKIE_NAME);
  if (fallback) return fallback;
  throw new Error("CSRF token unavailable");
}

export async function withCsrf(init: RequestInit = {}): Promise<RequestInit> {
  const csrf = await ensureCsrfToken();
  return {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      [CSRF_HEADER_NAME]: csrf,
    },
  };
}

