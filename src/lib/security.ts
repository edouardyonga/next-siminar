import type { NextRequest, NextResponse } from "next/server";

export const CSRF_COOKIE_NAME = "csrfToken";
export const CSRF_HEADER_NAME = "x-csrf-token";

const twelveHoursInSeconds = 60 * 60 * 12;

const cookieOptions = {
  httpOnly: false,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: twelveHoursInSeconds,
};

function getWebCrypto() {
  const webCrypto = (globalThis as { crypto?: Crypto }).crypto;
  if (webCrypto && typeof webCrypto.getRandomValues === "function") return webCrypto;
  throw new Error("Web Crypto API is not available in this runtime");
}

function randomHex(bytes: number) {
  const array = new Uint8Array(bytes);
  getWebCrypto().getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateCsrfToken() {
  return randomHex(32);
}

export function setCsrfCookie(res: NextResponse, token?: string) {
  const csrfToken = token ?? generateCsrfToken();
  res.cookies.set(CSRF_COOKIE_NAME, csrfToken, cookieOptions);
  return csrfToken;
}

export function clearCsrfCookie(res: NextResponse) {
  res.cookies.set(CSRF_COOKIE_NAME, "", { ...cookieOptions, expires: new Date(0) });
}

export function extractCsrfPair(req: NextRequest) {
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = req.headers.get(CSRF_HEADER_NAME);
  return { cookieToken, headerToken };
}

export function isValidCsrfPair(cookieToken?: string | null, headerToken?: string | null) {
  if (!cookieToken || !headerToken) return false;
  const cookieBytes = hexToBytes(cookieToken);
  const headerBytes = hexToBytes(headerToken);
  if (!cookieBytes || !headerBytes || cookieBytes.length !== headerBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < cookieBytes.length; i++) {
    diff |= cookieBytes[i] ^ headerBytes[i];
  }
  return diff === 0;
}

function hexToBytes(hex: string) {
  if (hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const value = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(value)) return null;
    bytes[i] = value;
  }
  return bytes;
}

