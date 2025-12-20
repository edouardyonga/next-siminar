import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { trainerSchema } from "@/lib/validation";
import { requireAuth } from "@/lib/session";

type Params = { params: { id: string } };

async function parseId(params: Params["params"]) {
  const { id } = await params;
  const numericId = Number(id);
  if (Number.isNaN(numericId)) return null;
  return numericId;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireAuth(req);
    const id = await parseId(params);
    if (Number.isNaN(id) || id === null) return NextResponse.json({ error: { message: "Invalid id" } }, { status: 400 });

    const trainer = await prisma.trainer.findUnique({
      where: { id },
      include: {
        courses: {
          where: { deletedAt: null },
          orderBy: { startDate: "asc" },
        },
      },
    });
    if (!trainer) return NextResponse.json({ error: { message: "Not found" } }, { status: 404 });
    return NextResponse.json({ trainer });
  } catch (err) {
    const status = err instanceof Error && err.message === "unauthorized" ? 401 : 500;
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireAuth(req);
    const id = await parseId(params);
    if (Number.isNaN(id) || id === null) return NextResponse.json({ error: { message: "Invalid id" } }, { status: 400 });

    const existing = await prisma.trainer.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: { message: "Not found" } }, { status: 404 });

    const body = await req.json();
    const parsed = trainerSchema.parse({
      ...body,
      hourlyRate: body.hourlyRate !== undefined ? Number(body.hourlyRate) : undefined,
      rating: body.rating !== undefined ? Number(body.rating) : undefined,
    });

    const trainer = await prisma.trainer.update({
      where: { id },
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

    return NextResponse.json({ trainer });
  } catch (err) {
    console.error("Update trainer error", err);
    return NextResponse.json({ error: { message: "Failed to update trainer" } }, { status: err instanceof Error && err.message === "unauthorized" ? 401 : 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await requireAuth(req);
    const id = await parseId(params);
    if (Number.isNaN(id) || id === null) return NextResponse.json({ error: { message: "Invalid id" } }, { status: 400 });

    const existing = await prisma.trainer.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: { message: "Not found" } }, { status: 404 });

    const assignedCourses = await prisma.course.findMany({
      where: { assignedTrainerId: id, deletedAt: null },
      select: { id: true },
    });

    // Unassign trainer from any courses before delete and track history
    await prisma.$transaction([
      prisma.course.updateMany({ where: { assignedTrainerId: id }, data: { assignedTrainerId: null } }),
      prisma.assignmentHistory.createMany({
        data: assignedCourses.map((course) => ({
          courseId: course.id,
          trainerId: id,
          action: "unassigned (trainer deleted)",
          actor: existing.email,
        })),
      }),
      prisma.trainer.delete({ where: { id } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete trainer error", err);
    return NextResponse.json({ error: { message: "Failed to delete trainer" } }, { status: err instanceof Error && err.message === "unauthorized" ? 401 : 500 });
  }
}


