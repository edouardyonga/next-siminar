import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import type { NextRequest, NextResponse } from "next/server";
import { env } from "./env";
import type { AuthUser } from "./auth";

const SESSION_COOKIE = "session";
const secret = new TextEncoder().encode(env.AUTH_SECRET);

export async function getSessionUser(req?: NextRequest): Promise<AuthUser | null> {
  try {
    const token = req
      ? req.cookies.get(SESSION_COOKIE)?.value
      : (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    return { email: String(payload.sub), role: payload.role as "admin" };
  } catch {
    return null;
  }
}

export async function requireAuth(req?: NextRequest): Promise<AuthUser> {
  const user = await getSessionUser(req);
  if (!user) throw new Error("unauthorized");
  return user;
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, expires: new Date(0), path: "/" });
}


