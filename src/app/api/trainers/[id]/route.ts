import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { trainerSchema } from "@/lib/validation";
import { requireAuth } from "@/lib/session";

type Params = { params: { id: string } };

export async function GET(_: Request, { params }: Params) {
  const id = Number(params.id);
  if (Number.isNaN(id)) return NextResponse.json({ error: { message: "Invalid id" } }, { status: 400 });

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
}

export async function PUT(req: Request, { params }: Params) {
  try {
    await requireAuth();
    const id = Number(params.id);
    if (Number.isNaN(id)) return NextResponse.json({ error: { message: "Invalid id" } }, { status: 400 });

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

export async function DELETE(_: Request, { params }: Params) {
  try {
    await requireAuth();
    const id = Number(params.id);
    if (Number.isNaN(id)) return NextResponse.json({ error: { message: "Invalid id" } }, { status: 400 });

    const existing = await prisma.trainer.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: { message: "Not found" } }, { status: 404 });

    // Unassign trainer from any courses before delete.
    await prisma.$transaction([
      prisma.course.updateMany({ where: { assignedTrainerId: id }, data: { assignedTrainerId: null } }),
      prisma.trainer.delete({ where: { id } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete trainer error", err);
    return NextResponse.json({ error: { message: "Failed to delete trainer" } }, { status: err instanceof Error && err.message === "unauthorized" ? 401 : 500 });
  }
}


