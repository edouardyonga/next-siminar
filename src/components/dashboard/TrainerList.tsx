'use client';

import { Trainer } from "@/lib/types";

type Props = {
  trainers: Trainer[];
  selectedTrainerId: number | null;
  loading?: boolean;
  onSelect: (id: number) => void;
  onEdit: (trainer: Trainer) => void;
  onDelete: (id: number) => void;
};

export function TrainerList({ trainers, selectedTrainerId, loading, onSelect, onEdit, onDelete }: Props) {
  const isLoading = Boolean(loading);
  const isEmpty = !trainers.length && !isLoading;

  return (
    <>
      {/* Desktop table */}
      <div
        className="hidden overflow-x-auto rounded-xl border border-zinc-200 md:block"
        aria-busy={isLoading}
      >
        <table className="min-w-[640px] w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Trainer</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Subjects</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-zinc-500" role="status">
                  Loading trainers…
                </td>
              </tr>
            ) : null}
            {!isLoading && trainers.map((trainer) => (
              <tr
                key={trainer.id}
                className={`hover:bg-zinc-50 ${trainer.id === selectedTrainerId ? "bg-indigo-50/60" : ""}`}
              >
                <td
                  className="cursor-pointer px-4 py-3"
                  onClick={() => onSelect(trainer.id)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(trainer.id);
                    }
                  }}
                >
                  <div className="font-medium text-zinc-900">{trainer.name}</div>
                  <div className="text-xs text-zinc-500">{trainer.email}</div>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-700">{trainer.location}</td>
                <td className="px-4 py-3 text-sm text-zinc-700">
                  <div className="flex flex-wrap gap-1">
                    {trainer.trainingSubjects.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-xs text-zinc-500">
                  <button
                    className="mr-3 text-indigo-600 underline decoration-dotted underline-offset-4"
                    onClick={() => onEdit(trainer)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-red-600 underline decoration-dotted underline-offset-4"
                    onClick={() => onDelete(trainer.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {isEmpty ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-zinc-500" role="status">
                  No trainers match the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden" aria-busy={isLoading}>
        {isLoading ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center text-sm text-zinc-500" role="status">
            Loading trainers…
          </div>
        ) : null}
        {!isLoading && trainers.map((trainer) => (
          <div
            key={trainer.id}
            className={`rounded-xl border border-zinc-200 bg-white p-3 shadow-sm ${trainer.id === selectedTrainerId ? "ring-2 ring-indigo-200" : ""}`}
            onClick={() => onSelect(trainer.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(trainer.id);
              }
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-zinc-900">{trainer.name}</p>
                <p className="text-xs text-zinc-500">{trainer.email}</p>
                <p className="text-sm text-zinc-700">Location: {trainer.location}</p>
              </div>
              <div className="text-right text-xs text-zinc-600">
                <p className="font-medium text-zinc-800">Subjects</p>
                <div className="mt-1 flex flex-wrap justify-end gap-1">
                  {trainer.trainingSubjects.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-end gap-3 text-xs">
              <button
                className="text-indigo-600 underline decoration-dotted underline-offset-4"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(trainer);
                }}
              >
                Edit
              </button>
              <button
                className="text-red-600 underline decoration-dotted underline-offset-4"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(trainer.id);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {isEmpty ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-4 text-center text-sm text-zinc-500">
            No trainers match the current filters.
          </div>
        ) : null}
      </div>
    </>
  );
}

