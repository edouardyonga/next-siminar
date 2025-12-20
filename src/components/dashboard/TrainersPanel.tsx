'use client';

import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "./dashboard-provider";
import { TrainerForm } from "./TrainerForm";
import { Trainer } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { TrainerList } from "./TrainerList";
import { PaginationBar } from "./PaginationBar";

export function TrainersPanel() {
  const {
    trainers,
    courses,
    deleteTrainer,
    selectedTrainerId,
    selectTrainer,
    loading,
  } = useDashboard();
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editTrainer, setEditTrainer] = useState<Trainer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subjects = useMemo(
    () =>
      Array.from(
        new Set(
          trainers.flatMap((t) =>
            (t.trainingSubjects ?? [])
              .map((s) => s.trim())
              .filter((s): s is string => Boolean(s)),
          ),
        ),
      ),
    [trainers],
  );

  const locations = useMemo(
    () =>
      Array.from(
        new Set(
          trainers
            .map((t) => t.location)
            .filter((loc): loc is string => Boolean(loc && loc.trim()))
            .map((loc) => loc.trim()),
        ),
      ),
    [trainers],
  );

  const filtered = useMemo(() => {
    return trainers.filter((t) => {
      const query = search.toLowerCase();
      const matchesSearch =
        !query ||
        t.name.toLowerCase().includes(query) ||
        t.trainingSubjects.some((s) => s.toLowerCase().includes(query)) ||
        t.location.toLowerCase().includes(query);
      const matchesSubject =
        subjectFilter === "all"
          ? true
          : t.trainingSubjects.map((s) => s.toLowerCase()).includes(subjectFilter.toLowerCase());
      const matchesLocation = locationFilter === "all" ? true : t.location === locationFilter;
      return matchesSearch && matchesSubject && matchesLocation;
    });
  }, [trainers, search, subjectFilter, locationFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [search, subjectFilter, locationFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const selectedTrainer = useMemo(
    () => trainers.find((t) => t.id === selectedTrainerId) ?? null,
    [trainers, selectedTrainerId],
  );

  const activeCourses = useMemo(() => {
    if (!selectedTrainer) return [];
    return courses.filter((c) => c.assignedTrainerId === selectedTrainer.id);
  }, [courses, selectedTrainer]);

  const handleDelete = async (trainerId: number) => {
    if (!confirm("Delete trainer? Assigned courses will be unassigned.")) return;
    const res = await deleteTrainer(trainerId);
    if (!res.ok && res.message) setError(res.message);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Trainers</p>
          <h3 className="text-lg font-semibold text-zinc-900">Bench & availability</h3>
        </div>
        <button
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
          onClick={() => {
            setEditTrainer(null);
            setShowFormModal(true);
          }}
        >
          + Add trainer
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <input
          aria-label="Search trainer, subject, or location"
          placeholder="Search trainer, subject, or location"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Filter by subject"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
        >
          <option value="all">All subjects</option>
          {subjects.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by trainer location"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
        >
          <option value="all">All locations</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
      </div>

      <TrainerList
        trainers={paginated}
        selectedTrainerId={selectedTrainerId}
        loading={loading}
        onSelect={(id) => selectTrainer(id)}
        onEdit={(trainer) => {
          setEditTrainer(trainer);
          setShowFormModal(true);
        }}
        onDelete={handleDelete}
      />
      <PaginationBar
        id="trainers-pagination"
        page={currentPage}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
      {error ? (
        <p className="text-sm text-red-600" role="status" aria-live="polite">
          {error}
        </p>
      ) : null}

      <TrainerProfile trainer={selectedTrainer} courses={activeCourses} />

      <Modal
        open={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditTrainer(null);
        }}
        title={editTrainer ? "Edit trainer" : "Create trainer"}
        widthClass="max-w-xl"
      >
        <TrainerForm
          initial={editTrainer}
          onSaved={() => {
            setShowFormModal(false);
            setEditTrainer(null);
          }}
          onCancel={() => {
            setShowFormModal(false);
            setEditTrainer(null);
          }}
        />
      </Modal>
    </div>
  );
}

function TrainerProfile({
  trainer,
  courses,
}: {
  trainer: Trainer | null;
  courses: { name: string; startDate: string; endDate: string; id: number }[];
}) {
  if (!trainer) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-4 text-sm text-zinc-500">
        Select a trainer to view their profile.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Trainer profile</p>
          <h3 className="text-lg font-semibold text-zinc-900">{trainer.name}</h3>
          <p className="text-sm text-zinc-500">{trainer.email}</p>
        </div>
        {trainer.rating ? (
          <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
            {trainer.rating}★
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm text-zinc-700">
        <Detail label="Location" value={trainer.location} />
        <Detail label="Subjects" value={trainer.trainingSubjects.join(", ")} />
        <Detail
          label="Availability"
          value={
            trainer.availabilityRanges?.length ? (
              <ul className="space-y-1">
                {trainer.availabilityRanges.map((range, idx) => (
                  <li key={`${range.start}-${idx}`} className="text-xs text-zinc-600">
                    {formatDate(range.start)} → {formatDate(range.end)}
                  </li>
                ))}
              </ul>
            ) : (
              "Not provided"
            )
          }
        />
        <Detail label="Hourly rate" value={trainer.hourlyRate ? `${trainer.hourlyRate}€` : "—"} />
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-zinc-500">Assigned courses</p>
        <div className="mt-2 space-y-2">
          {courses.length ? (
            courses.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
              >
                <div>
                  <p className="font-medium text-zinc-900">{c.name}</p>
                  <p className="text-xs text-zinc-500">
                    {formatDate(c.startDate)} → {formatDate(c.endDate)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-500">No assigned courses</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="text-sm text-zinc-800">{value}</div>
    </div>
  );
}


