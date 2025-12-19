import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    return NextResponse.json({ user });
  } catch (err) {
    const status = err instanceof Error && err.message === "unauthorized" ? 401 : 500;
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status });
  }
}


