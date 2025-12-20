'use client';

import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "./dashboard-provider";
import { Conflict, TrainerMatchResponse, TrainerMatchSuggestion } from "@/lib/types";
import { formatDateRange } from "@/lib/format";

export function AssignmentPanel() {
  const { courses, trainers, assignTrainer, selectedCourseId, selectCourse } = useDashboard();
  const [selectedTrainerId, setSelectedTrainerId] = useState<number | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [suggestions, setSuggestions] = useState<TrainerMatchSuggestion[]>([]);
  const [suggestionsMeta, setSuggestionsMeta] = useState<{
    source?: string;
    model?: string;
    usedCache?: boolean;
    fallbackReason?: string;
    error?: string;
  }>({});
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  );

  useEffect(() => {
    if (!selectedCourseId) {
      setSuggestions([]);
      setSuggestionsMeta({});
      setSuggestionsError(null);
      return;
    }

    const controller = new AbortController();
    setSuggestionsLoading(true);
    setSuggestionsError(null);

    fetch(`/api/courses/${selectedCourseId}/match`, { signal: controller.signal })
      .then(async (res) => {
        const body: TrainerMatchResponse | { error?: { message?: string } } = await res.json();
        if (!res.ok) {
          const message =
            typeof (body as any)?.error === "string"
              ? (body as any).error
              : body && "error" in body && (body as any).error?.message
                ? (body as any).error.message
                : "Failed to load suggestions";
          throw new Error(message);
        }
        const payload = body as TrainerMatchResponse;
        setSuggestions(payload.suggestions ?? []);
        setSuggestionsMeta({
          source: payload.source,
          model: payload.model,
          usedCache: payload.usedCache,
          fallbackReason: payload.fallbackReason,
          error: payload.error,
        });
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSuggestions([]);
        setSuggestionsMeta({});
        setSuggestionsError(err instanceof Error ? err.message : "Failed to load suggestions");
      })
      .finally(() => setSuggestionsLoading(false));

    return () => controller.abort();
  }, [selectedCourseId]);

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

    setMessage(res.message ?? "Trainer assigned");
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
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
            <p className="uppercase tracking-wide">AI suggestions</p>
            {suggestionsMeta.source ? (
              <span className="rounded-full bg-white px-2 py-1 font-semibold text-indigo-700">
                {suggestionsMeta.usedCache ? "cached" : suggestionsMeta.source}
                {suggestionsMeta.model ? ` • ${suggestionsMeta.model}` : ""}
              </span>
            ) : null}
          </div>
          {suggestionsMeta.fallbackReason ? (
            <p className="text-xs text-amber-700">
              Fallback used: {suggestionsMeta.fallbackReason}
            </p>
          ) : null}
          {suggestionsError ? (
            <p className="text-xs text-red-700">{suggestionsError}</p>
          ) : null}
          {selectedCourse ? (
            suggestionsLoading ? (
              <p className="text-sm text-zinc-600">Loading suggestions…</p>
            ) : suggestions.length ? (
              suggestions.map((s) =>
                s.trainer ? (
                  <div
                    key={`${s.trainer.id}-${s.score}`}
                    className="rounded-lg border border-zinc-200 bg-white p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-zinc-900">{s.trainer.name}</p>
                        <p className="text-xs text-zinc-500">{s.trainer.location}</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                          Score {s.score}
                        </span>
                        <p className="text-[11px] text-zinc-500">Confidence {s.confidence}%</p>
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
                ) : null,
              )
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


