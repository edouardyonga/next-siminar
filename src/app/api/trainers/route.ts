import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { trainerSchema } from "@/lib/validation";
import { requireAuth } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const trainers = await prisma.trainer.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ trainers });
  } catch (err) {
    const status = err instanceof Error && err.message === "unauthorized" ? 401 : 500;
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAuth();
    const body = await req.json();
    const parsed = trainerSchema.parse({
      ...body,
      hourlyRate: body.hourlyRate !== undefined ? Number(body.hourlyRate) : undefined,
      rating: body.rating !== undefined ? Number(body.rating) : undefined,
    });

    const trainer = await prisma.trainer.create({
      data: {
        name: parsed.name,
        email: parsed.email,
        location: parsed.location,
        trainingSubjects: parsed.trainingSubjects,
        availabilityRanges: parsed.availabilityRanges,
        hourlyRate: parsed.hourlyRate,
        rating: parsed.rating,
      },
    });

    return NextResponse.json({ trainer }, { status: 201 });
  } catch (err) {
    console.error("Create trainer error", err);
    return NextResponse.json({ error: { message: "Failed to create trainer" } }, { status: err instanceof Error && err.message === "unauthorized" ? 401 : 500 });
  }
}


