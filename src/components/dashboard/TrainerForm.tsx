'use client';

import { useEffect, useMemo, useState } from "react";
import { Trainer, TrainerPayload } from "@/lib/types";
import { useDashboard } from "./dashboard-provider";

type Props = {
  initial?: Trainer | null;
  onSaved?: () => void;
  onCancel?: () => void;
};

type AvailabilityRow = { id: string; start: string; end: string };

function toInputDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function toAvailabilityRows(ranges?: Trainer["availabilityRanges"]): AvailabilityRow[] {
  return (
    ranges?.map((r, idx) => ({
      id: `${r.start}-${idx}`,
      start: toInputDate(r.start),
      end: toInputDate(r.end),
    })) ?? []
  );
}

export function TrainerForm({ initial, onSaved, onCancel }: Props) {
  const { upsertTrainer } = useDashboard();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    location: initial?.location ?? "",
    trainingSubjects: (initial?.trainingSubjects ?? []).join(", "),
    hourlyRate: initial?.hourlyRate ? String(initial.hourlyRate) : "",
    rating: initial?.rating ? String(initial.rating) : "",
  });
  const [availabilityRows, setAvailabilityRows] = useState<AvailabilityRow[]>(
    toAvailabilityRows(initial?.availabilityRanges),
  );

  useEffect(() => {
    setForm({
      name: initial?.name ?? "",
      email: initial?.email ?? "",
      location: initial?.location ?? "",
      trainingSubjects: (initial?.trainingSubjects ?? []).join(", "),
      hourlyRate: initial?.hourlyRate ? String(initial.hourlyRate) : "",
      rating: initial?.rating ? String(initial.rating) : "",
    });
    setAvailabilityRows(toAvailabilityRows(initial?.availabilityRanges));
  }, [initial]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availabilityPayload = useMemo(() => {
    const cleaned = availabilityRows
      .filter((row) => row.start && row.end)
      .map((row) => {
        const startIso = new Date(row.start).toISOString();
        const endIso = new Date(row.end).toISOString();
        return { start: startIso, end: endIso };
      });
    return cleaned.length ? cleaned : undefined;
  }, [availabilityRows]);

  const payload: TrainerPayload = useMemo(
    () => ({
      name: form.name.trim(),
      email: form.email.trim(),
      location: form.location.trim(),
      trainingSubjects: form.trainingSubjects
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      availabilityRanges: availabilityPayload,
      hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
      rating: form.rating ? Number(form.rating) : undefined,
    }),
    [form, availabilityPayload],
  );

  const submit = async () => {
    setError(null);

    // Validate rows
    for (const row of availabilityRows) {
      if (!row.start && !row.end) continue; // allow blank rows
      if (!row.start || !row.end) {
        setError("Availability ranges need both start and end.");
        return;
      }
      const start = new Date(row.start).getTime();
      const end = new Date(row.end).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && end <= start) {
        setError("Availability end must be after start.");
        return;
      }
    }

    setSaving(true);
    const res = await upsertTrainer(payload, { trainerId: initial?.id });
    setSaving(false);
    if (!res.ok) {
      setError(res.message ?? "Unable to save trainer");
      return;
    }
    onSaved?.();
  };

  const updateRow = (id: string, key: "start" | "end", value: string) => {
    setAvailabilityRows((rows) => rows.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  };

  const addRow = () => {
    setAvailabilityRows((rows) => [...rows, { id: crypto.randomUUID(), start: "", end: "" }]);
  };

  const removeRow = (id: string) => {
    setAvailabilityRows((rows) => rows.filter((r) => r.id !== id));
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
        <div className="space-y-2 text-sm text-zinc-700">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="font-medium">Availability ranges</p>
              <p className="text-xs text-zinc-500">Use local time. End must be after start.</p>
            </div>
            <button
              type="button"
              onClick={addRow}
              className="text-xs font-medium text-indigo-600 underline decoration-dotted underline-offset-4"
            >
              + Add
            </button>
          </div>
          <div className="space-y-2">
            {availabilityRows.map((row) => (
              <div key={row.id} className="grid grid-cols-[1fr,1fr,auto] items-center gap-2">
                <input
                  type="datetime-local"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  value={row.start}
                  onChange={(e) => updateRow(row.id, "start", e.target.value)}
                />
                <input
                  type="datetime-local"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  value={row.end}
                  onChange={(e) => updateRow(row.id, "end", e.target.value)}
                />
                <button
                  type="button"
                  className="text-xs text-red-600 underline decoration-dotted underline-offset-4"
                  onClick={() => removeRow(row.id)}
                >
                  Remove
                </button>
              </div>
            ))}
            {!availabilityRows.length ? (
              <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-2 text-xs text-zinc-500">
                No availability set. Add a range above.
              </p>
            ) : null}
          </div>
        </div>
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


