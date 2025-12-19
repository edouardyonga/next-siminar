import { prisma } from "./prisma";

type Conflict = {
  type: "location" | "trainer";
  courseId: number;
  courseName: string;
  reason: string;
};

export async function detectCourseConflicts(params: {
  courseId?: number;
  startDate: Date;
  endDate: Date;
  location: string;
  assignedTrainerId?: number | null;
}) {
  const { courseId, startDate, endDate, location, assignedTrainerId } = params;
  const conflicts: Conflict[] = [];

  // Location conflicts
  const overlappingAtLocation = await prisma.course.findMany({
    where: {
      deletedAt: null,
      id: courseId ? { not: courseId } : undefined,
      location,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    select: { id: true, name: true, startDate: true, endDate: true },
  });

  overlappingAtLocation.forEach((c) => {
    conflicts.push({
      type: "location",
      courseId: c.id,
      courseName: c.name,
      reason: `Location conflict with course "${c.name}" (${c.startDate.toISOString()} - ${c.endDate.toISOString()})`,
    });
  });

  // Trainer conflicts
  if (assignedTrainerId) {
    const overlappingTrainerCourses = await prisma.course.findMany({
      where: {
        deletedAt: null,
        id: courseId ? { not: courseId } : undefined,
        assignedTrainerId,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: { id: true, name: true, startDate: true, endDate: true },
    });

    overlappingTrainerCourses.forEach((c) => {
      conflicts.push({
        type: "trainer",
        courseId: c.id,
        courseName: c.name,
        reason: `Trainer is already assigned to "${c.name}" (${c.startDate.toISOString()} - ${c.endDate.toISOString()})`,
      });
    });
  }

  return conflicts;
}

