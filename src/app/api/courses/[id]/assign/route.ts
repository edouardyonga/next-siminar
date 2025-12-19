import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectCourseConflicts } from "@/lib/conflicts";
import { requireAuth } from "@/lib/session";
import { sendTrainerAssignmentEmail } from "@/lib/mail";

type Params = { params: { id: string } };

async function parseId(params: Params["params"]) {
  const { id } = await params;
  const numericId = Number(id);
  if (Number.isNaN(numericId)) return null;
  return numericId;
}

export async function POST(req: Request, { params }: Params) {
  try {
    const user = await requireAuth();
    const courseId = await parseId(params);
    if (Number.isNaN(courseId) || courseId === null) return NextResponse.json({ error: { message: "Invalid id" } }, { status: 400 });

    const body = await req.json();
    const trainerId = Number(body.trainerId);
    const allowOverride = Boolean(body.allowOverride);
    if (Number.isNaN(trainerId)) {
      return NextResponse.json({ error: { message: "trainerId required" } }, { status: 400 });
    }

    const [course, trainer] = await Promise.all([
      prisma.course.findFirst({ where: { id: courseId, deletedAt: null } }),
      prisma.trainer.findUnique({ where: { id: trainerId } }),
    ]);

    if (!course) return NextResponse.json({ error: { message: "Course not found" } }, { status: 404 });
    if (!trainer) return NextResponse.json({ error: { message: "Trainer not found" } }, { status: 404 });

    const conflicts = await detectCourseConflicts({
      courseId,
      startDate: course.startDate,
      endDate: course.endDate,
      location: course.location,
      assignedTrainerId: trainerId,
    });

    if (conflicts.length && !allowOverride) {
      return NextResponse.json({ conflicts }, { status: 409 });
    }

    const updated = await prisma.course.update({
      where: { id: courseId },
      data: { assignedTrainerId: trainerId },
      include: { assignedTrainer: true },
    });

    await prisma.assignmentHistory.create({
      data: {
        courseId,
        trainerId,
        action: "assigned",
        actor: user.email,
      },
    });

    let emailStatus: { sent: boolean; error?: string } = { sent: false };
    try {
      await sendTrainerAssignmentEmail({
        course: updated,
        trainer,
        assignedBy: user.email,
      });
      emailStatus = { sent: true };
    } catch (err) {
      console.error("Trainer assignment email error", err);
      emailStatus = {
        sent: false,
        error: err instanceof Error ? err.message : "Unable to send notification email",
      };
    }

    return NextResponse.json({ course: updated, conflicts, emailStatus });
  } catch (err) {
    console.error("Assign trainer error", err);
    return NextResponse.json({ error: { message: "Failed to assign trainer" } }, { status: err instanceof Error && err.message === "unauthorized" ? 401 : 500 });
  }
}


