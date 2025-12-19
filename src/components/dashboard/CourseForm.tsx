'use client';

import { useEffect, useMemo, useState } from "react";
import { Conflict, Course, CoursePayload, Trainer } from "@/lib/types";
import { useDashboard } from "./dashboard-provider";
import { formatDate } from "@/lib/format";

type Props = {
  trainers: Trainer[];
  initial?: Course | null;
  onSaved?: () => void;
  onCancel?: () => void;
};

function toInputDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function parseSubjects(value: string) {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const statusOptions = ["draft", "scheduled", "completed", "cancelled"] as const;

export function CourseForm({ trainers, initial, onSaved, onCancel }: Props) {
  const { upsertCourse } = useDashboard();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    subject: (initial?.subject ?? []).join(", "),
    startDate: toInputDate(initial?.startDate) ?? "",
    endDate: toInputDate(initial?.endDate) ?? "",
    location: initial?.location ?? "",
    participants: String(initial?.participants ?? ""),
    notes: initial?.notes ?? "",
    price: String(initial?.price ?? ""),
    trainerPrice: String(initial?.trainerPrice ?? ""),
    status: initial?.status ?? "draft",
    assignedTrainerId: initial?.assignedTrainerId
      ? String(initial.assignedTrainerId)
      : "",
  });

  useEffect(() => {
    setForm({
      name: initial?.name ?? "",
      subject: (initial?.subject ?? []).join(", "),
      startDate: toInputDate(initial?.startDate) ?? "",
      endDate: toInputDate(initial?.endDate) ?? "",
      location: initial?.location ?? "",
      participants: String(initial?.participants ?? ""),
      notes: initial?.notes ?? "",
      price: String(initial?.price ?? ""),
      trainerPrice: String(initial?.trainerPrice ?? ""),
      status: initial?.status ?? "draft",
      assignedTrainerId: initial?.assignedTrainerId
        ? String(initial.assignedTrainerId)
        : "",
    });
  }, [initial]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  const payload: CoursePayload = useMemo(
    () => ({
      name: form.name.trim(),
      subject: parseSubjects(form.subject),
      startDate: form.startDate ? new Date(form.startDate).toISOString() : "",
      endDate: form.endDate ? new Date(form.endDate).toISOString() : "",
      location: form.location.trim(),
      participants: Number(form.participants),
      notes: form.notes?.trim() || undefined,
      price: Number(form.price),
      trainerPrice: Number(form.trainerPrice),
      status: form.status as Course["status"],
      assignedTrainerId: form.assignedTrainerId ? Number(form.assignedTrainerId) : undefined,
    }),
    [form],
  );

  const submit = async (opts?: { allowOverride?: boolean }) => {
    setSaving(true);
    setError(null);
    setConflicts([]);
    const result = await upsertCourse(payload, {
      courseId: initial?.id,
      allowOverride: opts?.allowOverride,
    });
    setSaving(false);

    if (!result.ok && result.conflicts) {
      setConflicts(result.conflicts);
      return;
    }
    if (!result.ok) {
      setError(result.message ?? "Unable to save");
      return;
    }

    onSaved?.();
    setConflicts([]);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {initial ? "Edit course" : "Create course"}
          </p>
          <h3 className="text-lg font-semibold text-zinc-900">
            {initial ? initial.name : "New course"}
          </h3>
        </div>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-zinc-500 underline decoration-dotted underline-offset-4"
          >
            Cancel
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm text-zinc-700">
          Name
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </label>
        <label className="space-y-1 text-sm text-zinc-700">
          Subjects (comma separated)
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          />
        </label>
        <label className="space-y-1 text-sm text-zinc-700">
          Start date
          <input
            type="datetime-local"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
          />
        </label>
        <label className="space-y-1 text-sm text-zinc-700">
          End date
          <input
            type="datetime-local"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={form.endDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
          />
        </label>
        <label className="space-y-1 text-sm text-zinc-700">
          Location
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          />
        </label>
        <label className="space-y-1 text-sm text-zinc-700">
          Participants
          <input
            type="number"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={form.participants}
            onChange={(e) => setForm((f) => ({ ...f, participants: e.target.value }))}
          />
        </label>
        <label className="space-y-1 text-sm text-zinc-700">
          Price (client)
          <input
            type="number"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          />
        </label>
        <label className="space-y-1 text-sm text-zinc-700">
          Trainer price
          <input
            type="number"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={form.trainerPrice}
            onChange={(e) => setForm((f) => ({ ...f, trainerPrice: e.target.value }))}
          />
        </label>
        <label className="space-y-1 text-sm text-zinc-700">
          Status
          <select
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({ ...f, status: e.target.value as Course["status"] }))
            }
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm text-zinc-700">
          Assigned trainer
          <select
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={form.assignedTrainerId}
            onChange={(e) => setForm((f) => ({ ...f, assignedTrainerId: e.target.value }))}
          >
            <option value="">Unassigned</option>
            {trainers.map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.name} • {trainer.location}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm text-zinc-700 md:col-span-2">
          Notes
          <textarea
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </label>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
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
            disabled={saving}
            onClick={() => submit({ allowOverride: true })}
          >
            Override and save
          </button>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <div className="text-xs text-zinc-500">
          {initial?.startDate ? `Last updated ${formatDate(initial.updatedAt)}` : "Validation enforced via Zod"}
        </div>
        <button
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          disabled={saving}
          onClick={() => submit()}
        >
          {saving ? "Saving..." : initial ? "Update course" : "Create course"}
        </button>
      </div>
    </div>
  );
}


