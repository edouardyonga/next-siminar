'use client';

import { useEffect, useMemo, useState } from "react";
import { Trainer, TrainerPayload } from "@/lib/types";
import { useDashboard } from "./dashboard-provider";

type Props = {
  initial?: Trainer | null;
  onSaved?: () => void;
  onCancel?: () => void;
};

function toAvailabilityInput(ranges?: Trainer["availabilityRanges"]) {
  return ranges
    ?.map((r) => `${r.start} | ${r.end}`)
    .join("\n");
}

function parseAvailability(value: string) {
  const lines = value.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.map((line) => {
    const [start, end] = line.split("|").map((p) => p.trim());
    return { start, end };
  });
}

export function TrainerForm({ initial, onSaved, onCancel }: Props) {
  const { upsertTrainer } = useDashboard();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    location: initial?.location ?? "",
    trainingSubjects: (initial?.trainingSubjects ?? []).join(", "),
    availability: toAvailabilityInput(initial?.availabilityRanges) ?? "",
    hourlyRate: initial?.hourlyRate ? String(initial.hourlyRate) : "",
    rating: initial?.rating ? String(initial.rating) : "",
  });

  useEffect(() => {
    setForm({
      name: initial?.name ?? "",
      email: initial?.email ?? "",
      location: initial?.location ?? "",
      trainingSubjects: (initial?.trainingSubjects ?? []).join(", "),
      availability: toAvailabilityInput(initial?.availabilityRanges) ?? "",
      hourlyRate: initial?.hourlyRate ? String(initial.hourlyRate) : "",
      rating: initial?.rating ? String(initial.rating) : "",
    });
  }, [initial]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payload: TrainerPayload = useMemo(
    () => ({
      name: form.name.trim(),
      email: form.email.trim(),
      location: form.location.trim(),
      trainingSubjects: form.trainingSubjects
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      availabilityRanges: form.availability ? parseAvailability(form.availability) : undefined,
      hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
      rating: form.rating ? Number(form.rating) : undefined,
    }),
    [form],
  );

  const submit = async () => {
    setSaving(true);
    setError(null);
    const res = await upsertTrainer(payload, { trainerId: initial?.id });
    setSaving(false);
    if (!res.ok) {
      setError(res.message ?? "Unable to save trainer");
      return;
    }
    onSaved?.();
  };

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {initial ? "Edit trainer" : "Create trainer"}
          </p>
          <h3 className="text-lg font-semibold text-zinc-900">
            {initial ? initial.name : "New trainer"}
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
          />
        </label>
        <label className="space-y-1 text-sm text-zinc-700">
          Email
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
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
          Subjects (comma separated)
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={form.trainingSubjects}
            onChange={(e) => setForm((f) => ({ ...f, trainingSubjects: e.target.value }))}
          />
        </label>
        <label className="space-y-1 text-sm text-zinc-700">
          Availability ranges (one per line, "start | end")
          <textarea
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            rows={3}
            value={form.availability}
            onChange={(e) => setForm((f) => ({ ...f, availability: e.target.value }))}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-sm text-zinc-700">
            Hourly rate
            <input
              type="number"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={form.hourlyRate}
              onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))}
            />
          </label>
          <label className="space-y-1 text-sm text-zinc-700">
            Rating (1-5)
            <input
              type="number"
              min={1}
              max={5}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={form.rating}
              onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
            />
          </label>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex items-center justify-end gap-2">
        <button
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          disabled={saving}
          onClick={submit}
        >
          {saving ? "Saving..." : initial ? "Update trainer" : "Create trainer"}
        </button>
      </div>
    </div>
  );
}


