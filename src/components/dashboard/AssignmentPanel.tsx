'use client';

import { useMemo, useState } from "react";
import { useDashboard } from "./dashboard-provider";
import { Conflict, Course, Trainer } from "@/lib/types";
import { formatDateRange } from "@/lib/format";

type Suggestion = { trainer: Trainer; score: number; reasons: string[] };

function computeScore(course: Course, trainer: Trainer, allCourses: Course[]): Suggestion {
  let score = 0;
  const reasons: string[] = [];

  const overlap = course.subject.filter((s) =>
    trainer.trainingSubjects.map((t) => t.toLowerCase()).includes(s.toLowerCase()),
  );
  if (overlap.length) {
    score += overlap.length * 10;
    reasons.push(`Matches subjects: ${overlap.join(", ")}`);
  }

  if (trainer.location.toLowerCase() === course.location.toLowerCase()) {
    score += 8;
    reasons.push("Same location");
  }

  const availabilityOk =
    trainer.availabilityRanges?.some((range) => {
      const start = new Date(range.start).getTime();
      const end = new Date(range.end).getTime();
      const cs = new Date(course.startDate).getTime();
      const ce = new Date(course.endDate).getTime();
      return start <= cs && end >= ce;
    }) ?? false;
  if (availabilityOk) {
    score += 7;
    reasons.push("Available for the date range");
  }

  const activeAssignments = allCourses.filter(
    (c) => c.assignedTrainerId === trainer.id && new Date(c.endDate) >= new Date(),
  ).length;
  score += Math.max(0, 5 - activeAssignments); // fewer active courses = higher score
  reasons.push(`Active courses: ${activeAssignments}`);

  // Rating
  if (trainer.rating) {
    score += trainer.rating;
    reasons.push(`Rating ${trainer.rating}★`);
  }

  return { trainer, score, reasons };
}

export function AssignmentPanel() {
  const { courses, trainers, assignTrainer, selectedCourseId, selectCourse } = useDashboard();
  const [selectedTrainerId, setSelectedTrainerId] = useState<number | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  );

  const suggestions = useMemo(() => {
    if (!selectedCourse) return [];
    return trainers
      .map((trainer) => computeScore(selectedCourse, trainer, courses))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [courses, trainers, selectedCourse]);

  const submit = async (opts?: { allowOverride?: boolean; trainerId?: number }) => {
    if (!selectedCourse) return;
    const trainerId = opts?.trainerId ?? selectedTrainerId;
    if (!trainerId) {
      setMessage("Select a trainer");
      return;
    }

    setAssigning(true);
    setMessage(null);
    setConflicts([]);
    const res = await assignTrainer(selectedCourse.id, trainerId, {
      allowOverride: opts?.allowOverride,
    });
    setAssigning(false);

    if (!res.ok && res.conflicts) {
      setConflicts(res.conflicts);
      return;
    }
    if (!res.ok) {
      setMessage(res.message ?? "Failed to assign trainer");
      return;
    }

    setMessage("Trainer assigned");
  };

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Trainer assignment</p>
          <h3 className="text-lg font-semibold text-zinc-900">Prevent conflicts & suggest matches</h3>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.1fr,1fr]">
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={selectedCourseId ?? ""}
              onChange={(e) => selectCourse(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Select course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} • {formatDateRange(c.startDate, c.endDate)}
                </option>
              ))}
            </select>

            <select
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={selectedTrainerId ?? ""}
              onChange={(e) =>
                setSelectedTrainerId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Select trainer</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} • {t.location}
                </option>
              ))}
            </select>
          </div>

          <button
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={!selectedCourse || !selectedTrainerId || assigning}
            onClick={() => submit()}
          >
            {assigning ? "Assigning..." : "Assign trainer"}
          </button>

          {conflicts.length ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">Conflicts detected</p>
              <ul className="mt-2 list-disc pl-5">
                {conflicts.map((c) => (
                  <li key={`${c.type}-${c.courseId}`}>{c.reason}</li>
                ))}
              </ul>
              <button
                className="mt-3 inline-flex items-center justify-center rounded-lg bg-amber-600 px-3 py-1 text-xs font-medium text-white"
                disabled={assigning}
                onClick={() => submit({ allowOverride: true })}
              >
                Override and assign
              </button>
            </div>
          ) : null}
          {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
        </div>

        <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">AI-style suggestions</p>
          {selectedCourse ? (
            suggestions.length ? (
              suggestions.map((s) => (
                <div
                  key={s.trainer.id}
                  className="rounded-lg border border-zinc-200 bg-white p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-zinc-900">{s.trainer.name}</p>
                      <p className="text-xs text-zinc-500">{s.trainer.location}</p>
                    </div>
                    <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                      Score {s.score}
                    </div>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-zinc-600">
                    {s.reasons.map((reason) => (
                      <li key={reason}>• {reason}</li>
                    ))}
                  </ul>
                  <button
                    className="mt-2 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white"
                    onClick={() => submit({ trainerId: s.trainer.id })}
                    disabled={assigning}
                  >
                    Assign {s.trainer.name}
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-600">No suggestions available.</p>
            )
          ) : (
            <p className="text-sm text-zinc-600">Select a course to see suggestions.</p>
          )}
        </div>
      </div>
    </div>
  );
}


