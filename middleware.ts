import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, extractCsrfPair, isValidCsrfPair } from "@/lib/security";

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 120);

type Bucket = { tokens: number; lastRefill: number };
const buckets = new Map<string, Bucket>();

function getClientKey(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return req.nextUrl.hostname || "unknown";
}

function takeToken(key: string) {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: MAX_REQUESTS, lastRefill: now };
  const elapsed = now - bucket.lastRefill;
  const refill = Math.floor(elapsed / WINDOW_MS) * MAX_REQUESTS;
  const nextBucket: Bucket = {
    tokens: Math.min(MAX_REQUESTS, bucket.tokens + refill),
    lastRefill: refill ? now : bucket.lastRefill,
  };
  if (nextBucket.tokens <= 0) {
    buckets.set(key, nextBucket);
    return false;
  }
  nextBucket.tokens -= 1;
  buckets.set(key, nextBucket);
  return true;
}

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const csrfExemptPaths = ["/api/auth/login", "/api/auth/csrf"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/api/")) return NextResponse.next();

  const clientKey = getClientKey(req);
  if (!takeToken(clientKey)) {
    return NextResponse.json({ error: { message: "Too many requests" } }, { status: 429 });
  }

  if (!safeMethods.has(req.method) && !csrfExemptPaths.includes(pathname)) {
    const { cookieToken, headerToken } = extractCsrfPair(req);
    if (!isValidCsrfPair(cookieToken, headerToken)) {
      return NextResponse.json(
        { error: { message: "Invalid or missing CSRF token" } },
        { status: 403, headers: { "x-csrf-required": "true", "x-csrf-cookie": CSRF_COOKIE_NAME, "x-csrf-header": CSRF_HEADER_NAME } },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};

