import { NextResponse } from "next/server";
import { generateCsrfToken, setCsrfCookie } from "@/lib/security";

export async function GET() {
  const token = generateCsrfToken();
  const response = NextResponse.json({ token });
  setCsrfCookie(response, token);
  response.headers.set("x-csrf-token", token);
  return response;
}

