import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { courseSchema } from "@/lib/validation";
import { detectCourseConflicts } from "@/lib/conflicts";
import { requireAuth } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

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
    if (!id) return NextResponse.json({ error: { message: "Invalid id" } }, { status: 400 });

    const course = await prisma.course.findFirst({
      where: { id, deletedAt: null },
      include: { assignedTrainer: true },
    });
    if (!course) return NextResponse.json({ error: { message: "Not found" } }, { status: 404 });
    return NextResponse.json({ course });
  } catch (err) {
    const status = err instanceof Error && err.message === "unauthorized" ? 401 : 500;
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    const id = await parseId(params);
    if (!id) return NextResponse.json({ error: { message: "Invalid id" } }, { status: 400 });

    const existing = await prisma.course.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: { message: "Not found" } }, { status: 404 });

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
      courseId: id,
      startDate,
      endDate,
      location: parsed.location,
      assignedTrainerId: parsed.assignedTrainerId,
    });

    if (conflicts.length && !allowOverride) {
      return NextResponse.json({ conflicts }, { status: 409 });
    }

    const course = await prisma.course.update({
      where: { id },
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

    if (existing.assignedTrainerId !== parsed.assignedTrainerId) {
      if (existing.assignedTrainerId && !parsed.assignedTrainerId) {
        await prisma.assignmentHistory.create({
          data: {
            courseId: id,
            trainerId: existing.assignedTrainerId,
            action: "unassigned",
            actor: user.email,
          },
        });
      }
      if (parsed.assignedTrainerId) {
        await prisma.assignmentHistory.create({
          data: {
            courseId: id,
            trainerId: parsed.assignedTrainerId,
            action: "assigned",
            actor: user.email,
          },
        });
      }
    }

    return NextResponse.json({ course, conflicts });
  } catch (err) {
    console.error("Update course error", err);
    return NextResponse.json({ error: { message: "Failed to update course" } }, { status: err instanceof Error && err.message === "unauthorized" ? 401 : 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await requireAuth(req);
    const id = await parseId(params);
    if (!id) return NextResponse.json({ error: { message: "Invalid id" } }, { status: 400 });

    const existing = await prisma.course.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: { message: "Not found" } }, { status: 404 });

    await prisma.course.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete course error", err);
    return NextResponse.json({ error: { message: "Failed to delete course" } }, { status: err instanceof Error && err.message === "unauthorized" ? 401 : 500 });
  }
}


