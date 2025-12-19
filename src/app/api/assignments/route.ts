import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const searchParams = req.nextUrl.searchParams;
    const courseIdParam = searchParams.get("courseId");
    const trainerIdParam = searchParams.get("trainerId");

    const courseId = courseIdParam ? Number(courseIdParam) : undefined;
    const trainerId = trainerIdParam ? Number(trainerIdParam) : undefined;

    const history = await prisma.assignmentHistory.findMany({
      where: {
        courseId: Number.isFinite(courseId) ? courseId : undefined,
        trainerId: Number.isFinite(trainerId) ? trainerId : undefined,
      },
      include: { course: true, trainer: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ history });
  } catch (err) {
    console.error("Fetch assignment history error", err);
    const status = err instanceof Error && err.message === "unauthorized" ? 401 : 500;
    return NextResponse.json(
      { error: { message: "Failed to fetch assignment history", status } },
      { status },
    );
  }
}


