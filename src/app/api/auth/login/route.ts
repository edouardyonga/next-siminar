import { NextResponse } from "next/server";
import { verifyCredentials, signSession } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: { message: "Missing credentials" } }, { status: 400 });
    }

    const user = await verifyCredentials(email, password);
    if (!user) {
      return NextResponse.json({ error: { message: "Invalid credentials" } }, { status: 401 });
    }

    const token = await signSession(user);
    const res = NextResponse.json({ user: { email: user.email, role: user.role } });
    setSessionCookie(res, token);
    return res;
  } catch (err) {
    console.error("Login error", err);
    return NextResponse.json({ error: { message: "Unexpected error" } }, { status: 500 });
  }
}


