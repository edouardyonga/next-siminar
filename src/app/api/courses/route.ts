import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { courseSchema } from "@/lib/validation";
import { detectCourseConflicts } from "@/lib/conflicts";
import { requireAuth } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);

    const courses = await prisma.course.findMany({
      where: { deletedAt: null },
      orderBy: { startDate: "asc" },
      include: { assignedTrainer: true },
    });

    return NextResponse.json({ courses });
  } catch (err) {
    console.error("Fetch courses error", err);
    const status = err instanceof Error && err.message === "unauthorized" ? 401 : 500;
    return NextResponse.json({ error: { message: "Failed to fetch courses", status } }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAuth();
    const body = await req.json();
    const allowOverride = Boolean(body.allowOverride);

    const parsed = courseSchema.parse({
      ...body,
      participants: Number(body.participants),
      price: Number(body.price),
      trainerPrice: Number(body.trainerPrice),
    });

    const startDate = new Date(parsed.startDate);
    const endDate = new Date(parsed.endDate);

    const conflicts = await detectCourseConflicts({
      startDate,
      endDate,
      location: parsed.location,
      assignedTrainerId: parsed.assignedTrainerId,
    });

    if (conflicts.length && !allowOverride) {
      return NextResponse.json({ conflicts }, { status: 409 });
    }

    const course = await prisma.course.create({
      data: {
        name: parsed.name,
        startDate,
        endDate,
        subject: parsed.subject,
        location: parsed.location,
        participants: parsed.participants,
        notes: parsed.notes,
        price: parsed.price,
        trainerPrice: parsed.trainerPrice,
        status: parsed.status ?? "draft",
        assignedTrainerId: parsed.assignedTrainerId ?? null,
      },
    });

    return NextResponse.json({ course, conflicts }, { status: conflicts.length ? 201 : 201 });
  } catch (err) {
    console.error("Create course error", err);
    return NextResponse.json({ error: { message: "Failed to create course" } }, { status: err instanceof Error && err.message === "unauthorized" ? 401 : 500 });
  }
}


