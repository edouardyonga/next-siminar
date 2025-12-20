import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { getTrainerMatches } from "@/lib/ai-matching";
import type { Trainer, TrainerAvailability, TrainerMatchResponse } from "@/lib/types";

type Params = { params: { id: string } };

async function parseId(params: Params["params"]) {
  const { id } = await params;
  const numericId = Number(id);
  if (Number.isNaN(numericId)) return null;
  return numericId;
}

function parseAvailabilityRanges(value: unknown): TrainerAvailability[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const ranges: TrainerAvailability[] = [];
  for (const entry of value) {
    if (
      entry &&
      typeof entry === "object" &&
      "start" in entry &&
      "end" in entry &&
      typeof (entry as any).start === "string" &&
      typeof (entry as any).end === "string"
    ) {
      ranges.push({ start: (entry as any).start, end: (entry as any).end });
    }
  }
  return ranges.length ? ranges : undefined;
}

function toClientTrainer(dbTrainer: Awaited<ReturnType<typeof prisma.trainer.findFirst>>) {
  if (!dbTrainer) return null;
  const availabilityRanges = parseAvailabilityRanges(dbTrainer.availabilityRanges);
  return {
    id: dbTrainer.id,
    name: dbTrainer.name,
    email: dbTrainer.email,
    location: dbTrainer.location,
    trainingSubjects: dbTrainer.trainingSubjects,
    availabilityRanges,
    hourlyRate: dbTrainer.hourlyRate ? Number(dbTrainer.hourlyRate) : null,
    rating: dbTrainer.rating,
    createdAt: dbTrainer.createdAt.toISOString(),
    updatedAt: dbTrainer.updatedAt.toISOString(),
  } satisfies Trainer;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireAuth(req);
    const courseId = await parseId(params);
    if (courseId === null) {
      return NextResponse.json({ error: { message: "Invalid id" } }, { status: 400 });
    }

    const [course, trainers, activeCourses] = await Promise.all([
      prisma.course.findFirst({ where: { id: courseId, deletedAt: null } }),
      prisma.trainer.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.course.findMany({ where: { deletedAt: null } }),
    ]);

    if (!course) return NextResponse.json({ error: { message: "Course not found" } }, { status: 404 });
    if (!trainers.length) {
      return NextResponse.json({ error: { message: "No trainers available" } }, { status: 400 });
    }

    const result = await getTrainerMatches({
      course,
      trainers,
      activeCourses,
    });

    const suggestions =
      result.suggestions
        ?.map((s) => {
          const trainer = trainers.find((t) => t.id === s.trainerId);
          if (!trainer) return null;
          return {
            ...s,
            source: result.usedCache ? "cached" : result.source,
            trainer: toClientTrainer(trainer),
          };
        })
        .filter(Boolean) ?? [];

    const payload: TrainerMatchResponse = {
      suggestions: suggestions as TrainerMatchResponse["suggestions"],
      source: result.usedCache ? "cached" : result.source,
      usedCache: result.usedCache,
      model: result.model,
      fallbackReason: result.fallbackReason,
      error: result.error,
    };

    console.info("ai-trainer-matching-response", {
      courseId,
      source: payload.source,
      usedCache: payload.usedCache,
      model: payload.model,
      suggestions: payload.suggestions.length,
      fallbackReason: payload.fallbackReason,
      error: payload.error,
    });

    return NextResponse.json(payload);
  } catch (err) {
    console.error("Trainer match error", err);
    const status = err instanceof Error && err.message === "unauthorized" ? 401 : 500;
    return NextResponse.json({ error: { message: "Failed to generate trainer matches" } }, { status });
  }
}

