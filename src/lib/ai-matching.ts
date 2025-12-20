import { env } from "./env";
import type { Course, Trainer } from "@prisma/client";

type AvailabilityRange = { start: string; end: string };

export type RankedSuggestion = {
  trainerId: number;
  score: number;
  confidence: number;
  reasons: string[];
};

export type TrainerMatchResult = {
  suggestions: RankedSuggestion[];
  source: "ai" | "fallback";
  usedCache: boolean;
  model?: string;
  fallbackReason?: string;
  error?: string;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
type CacheEntry = { expiresAt: number; result: TrainerMatchResult };
const suggestionCache = new Map<string, CacheEntry>();

const OPENAI_MODEL = env.OPENAI_MODEL ?? "gpt-4o-mini";
const OPENAI_BASE_URL = env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";

function parseAvailabilityRanges(value: Trainer["availabilityRanges"]): AvailabilityRange[] | undefined {
  if (!value || !Array.isArray(value)) return undefined;
  const ranges: AvailabilityRange[] = [];
  for (const item of value) {
    if (
      item &&
      typeof item === "object" &&
      "start" in item &&
      "end" in item &&
      typeof (item as any).start === "string" &&
      typeof (item as any).end === "string"
    ) {
      ranges.push({ start: (item as any).start, end: (item as any).end });
    }
  }
  return ranges.length ? ranges : undefined;
}

type SerializableCourse = {
  id: number;
  name: string;
  subject: string[];
  location: string;
  participants: number;
  notes?: string | null;
  startDate: string;
  endDate: string;
};

type SerializableTrainer = {
  id: number;
  name: string;
  email: string;
  location: string;
  trainingSubjects: string[];
  availabilityRanges?: AvailabilityRange[] | undefined;
  rating?: number | null;
  hourlyRate?: number | null;
  updatedAt: string;
};

function serializeCourse(course: Course): SerializableCourse {
  return {
    id: course.id,
    name: course.name,
    subject: course.subject,
    location: course.location,
    participants: course.participants,
    notes: course.notes,
    startDate: course.startDate.toISOString(),
    endDate: course.endDate.toISOString(),
  };
}

function serializeTrainer(trainer: Trainer): SerializableTrainer {
  return {
    id: trainer.id,
    name: trainer.name,
    email: trainer.email,
    location: trainer.location,
    trainingSubjects: trainer.trainingSubjects,
    availabilityRanges: parseAvailabilityRanges(trainer.availabilityRanges),
    hourlyRate: trainer.hourlyRate ? Number(trainer.hourlyRate) : null,
    rating: trainer.rating,
    updatedAt: trainer.updatedAt.toISOString(),
  };
}

function buildCacheKey(course: Course, trainers: Trainer[]) {
  const trainerPart = trainers.map((t) => `${t.id}:${t.updatedAt.getTime()}`).join("|");
  return `${course.id}:${course.updatedAt.getTime()}:${trainerPart}`;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(num: number, min: number, max: number) {
  return Math.min(max, Math.max(min, num));
}

function computeAvailabilityScore(course: SerializableCourse, trainer: SerializableTrainer) {
  if (!trainer.availabilityRanges?.length) return { ok: true, score: 0, reason: "No availability provided; assuming flexible" };
  const courseStart = new Date(course.startDate).getTime();
  const courseEnd = new Date(course.endDate).getTime();
  const available = trainer.availabilityRanges.some((range) => {
    const start = new Date(range.start).getTime();
    const end = new Date(range.end).getTime();
    return start <= courseStart && end >= courseEnd;
  });
  return available
    ? { ok: true, score: 12, reason: "Available for the course date range" }
    : { ok: false, score: -18, reason: "Unavailable for the full date range" };
}

function computeFallbackSuggestions(params: {
  course: Course;
  trainers: Trainer[];
  activeCourses?: Course[];
}): RankedSuggestion[] {
  const course = serializeCourse(params.course);
  const trainers = params.trainers.map(serializeTrainer);
  const activeCourses = params.activeCourses ?? [];

  return trainers
    .map((trainer) => {
      let score = 0;
      const reasons: string[] = [];

      const subjectOverlap = course.subject.filter((s) =>
        trainer.trainingSubjects.some((t) => t.toLowerCase() === s.toLowerCase()),
      );
      if (subjectOverlap.length) {
        score += Math.min(45, subjectOverlap.length * 15);
        reasons.push(`Subject fit: ${subjectOverlap.join(", ")}`);
      } else {
        score -= 10;
        reasons.push("No direct subject overlap");
      }

      if (trainer.location.toLowerCase() === course.location.toLowerCase()) {
        score += 15;
        reasons.push("Same city as course");
      }

      const availability = computeAvailabilityScore(course, trainer);
      score += availability.score;
      reasons.push(availability.reason);

      if (trainer.rating) {
        score += clamp(trainer.rating, 1, 5) * 2.5; // up to ~12.5
        reasons.push(`Rating ${trainer.rating}★`);
      }

      const concurrent = activeCourses.filter(
        (c) =>
          c.assignedTrainerId === trainer.id &&
          c.id !== course.id &&
          c.deletedAt === null &&
          c.startDate <= params.course.endDate &&
          c.endDate >= params.course.startDate,
      ).length;
      const workloadScore = clamp(10 - concurrent * 3, -10, 10);
      score += workloadScore;
      reasons.push(concurrent ? `Already assigned to ${concurrent} overlapping course(s)` : "No overlapping courses");

      if (trainer.hourlyRate) {
        // Encourage cost-efficient options without dominating the score.
        const hourly = Number(trainer.hourlyRate);
        const costScore = hourly <= 80 ? 8 : hourly <= 120 ? 4 : 0;
        score += costScore;
        reasons.push(`Hourly rate ~${hourly}`);
      }

      const normalized = clamp(Math.round(score + 20), 0, 100);
      const confidence = clamp(Math.round(55 + normalized / 3), 45, 95);

      return {
        trainerId: trainer.id,
        score: normalized,
        confidence,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

async function callOpenAI(prompt: { system: string; user: string }): Promise<RankedSuggestion[]> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const body = {
    model: OPENAI_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
  };

  const maxAttempts = 3;
  let attempt = 0;
  let lastError: unknown;

  while (attempt < maxAttempts) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`AI API temporary error ${res.status}`);
        attempt += 1;
        await sleep(300 * Math.pow(2, attempt));
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`AI API failed: ${res.status} ${text}`);
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("AI response missing content");
      }

      const parsed = JSON.parse(content);
      const rawSuggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];

      const normalized: RankedSuggestion[] = rawSuggestions
        .map((item: any) => ({
          trainerId: Number(item.trainerId),
          score: clamp(Math.round(Number(item.score ?? item.matchScore ?? 0)), 0, 100),
          confidence: clamp(Math.round(Number(item.confidence ?? 0)), 0, 100),
          reasons:
            Array.isArray(item.reasons) && item.reasons.length
              ? item.reasons.map((r: any) => String(r)).slice(0, 5)
              : item.reason
                ? [String(item.reason)]
                : [],
        }))
        .filter((s: RankedSuggestion) => Number.isFinite(s.trainerId) && s.reasons.length);

      if (!normalized.length) {
        throw new Error("AI response empty or un-parseable");
      }

      return normalized.slice(0, 5);
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;
      if (err instanceof DOMException && err.name === "AbortError") {
        attempt += 1;
        continue;
      }
      attempt += 1;
      await sleep(300 * Math.pow(2, attempt));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("AI call failed");
}

function buildPrompt(course: SerializableCourse, trainers: SerializableTrainer[]) {
  const system = `
You are an expert operations coordinator for in-person training. Recommend the best trainers for a given course. 
Return ONLY JSON with this shape:
{
  "suggestions": [
    { "trainerId": number, "score": 0-100, "confidence": 0-100, "reasons": string[] }
  ]
}
Rules:
- Score must reflect subject expertise first, then location proximity, then availability, then experience/rating, then cost efficiency.
- Prefer trainers in the same city as the course; note travel if different.
- If availability data is missing, treat the trainer as flexible but do not boost score.
- If no strong match exists, return an empty array.
- Reasons must be concise (max 3) and evidence-based.
- Never invent trainers; use trainerId from the provided list.
`;

  const user = `
Course:
- id: ${course.id}
- name: ${course.name}
- subject(s): ${course.subject.join(", ")}
- location: ${course.location}
- start: ${course.startDate}
- end: ${course.endDate}
- participants: ${course.participants}
- notes: ${course.notes ?? "none"}

Trainers:
${trainers
  .map(
    (t) =>
      `- id: ${t.id}; name: ${t.name}; subjects: ${t.trainingSubjects.join(", ")}; location: ${t.location}; rating: ${
        t.rating ?? "n/a"
      }; hourlyRate: ${t.hourlyRate ?? "n/a"}; availability: ${
        t.availabilityRanges?.length
          ? t.availabilityRanges.map((r) => `${r.start} to ${r.end}`).join(" | ")
          : "not provided"
      }`,
  )
  .join("\n")}

Return the top 3-5 trainers ranked by fit.
`;

  return { system: system.trim(), user: user.trim() };
}

export async function getTrainerMatches(params: {
  course: Course;
  trainers: Trainer[];
  activeCourses?: Course[];
  useCache?: boolean;
}): Promise<TrainerMatchResult> {
  const { course, trainers, activeCourses, useCache = true } = params;

  if (!course || !trainers.length) {
    return { suggestions: [], source: "fallback", usedCache: false, fallbackReason: "Missing course or trainers" };
  }

  const cacheKey = buildCacheKey(course, trainers);
  if (useCache) {
    const cached = suggestionCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      console.info("ai-trainer-matching-cache", {
        courseId: course.id,
        source: cached.result.source,
        model: cached.result.model,
        suggestions: cached.result.suggestions.length,
      });
      return { ...cached.result, usedCache: true };
    }
  }

  const serializedCourse = serializeCourse(course);
  const serializedTrainers = trainers.map(serializeTrainer);

  try {
    const prompt = buildPrompt(serializedCourse, serializedTrainers);
    const aiSuggestions = await callOpenAI(prompt);

    const filtered = aiSuggestions.filter((s) => trainers.some((t) => t.id === s.trainerId));
    const result: TrainerMatchResult = {
      suggestions: filtered,
      source: "ai",
      usedCache: false,
      model: OPENAI_MODEL,
    };

    console.info("ai-trainer-matching", {
      courseId: course.id,
      source: "ai",
      model: OPENAI_MODEL,
      suggestions: filtered.length,
    });

    suggestionCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, result });
    return result;
  } catch (err) {
    const fallback = computeFallbackSuggestions({ course, trainers, activeCourses });
    const result: TrainerMatchResult = {
      suggestions: fallback,
      source: "fallback",
      usedCache: false,
      fallbackReason: err instanceof Error ? err.message : "AI unavailable",
      model: OPENAI_MODEL,
      error: err instanceof Error ? err.message : String(err),
    };
    console.warn("ai-trainer-matching-fallback", {
      courseId: course.id,
      reason: result.fallbackReason,
      model: OPENAI_MODEL,
    });
    suggestionCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, result });
    return result;
  }
}

