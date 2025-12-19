'use client';

import { Course } from "@/lib/types";
import { formatDateRange } from "@/lib/format";

type Props = {
  courses: Course[];
  selectedCourseId: number | null;
  loading?: boolean;
  onSelect: (id: number) => void;
  onEdit: (course: Course) => void;
  onDelete: (id: number) => void;
};

export function CourseList({ courses, selectedCourseId, onSelect, onEdit, onDelete, loading }: Props) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 md:block">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Trainer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {courses.map((course) => (
              <tr
                key={course.id}
                className={`hover:bg-zinc-50 ${course.id === selectedCourseId ? "bg-indigo-50/60" : ""}`}
              >
                <td
                  className="cursor-pointer px-4 py-3"
                  onClick={() => onSelect(course.id)}
                >
                  <div className="font-medium text-zinc-900">{course.name}</div>
                  <div className="text-xs text-zinc-500">{course.location}</div>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-700">
                  {formatDateRange(course.startDate, course.endDate)}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-700">
                  {course.assignedTrainer?.name ?? "Unassigned"}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium capitalize text-zinc-700">
                    {course.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-xs text-zinc-500">
                  <button
                    className="mr-3 text-indigo-600 underline decoration-dotted underline-offset-4"
                    onClick={() => onEdit(course)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-red-600 underline decoration-dotted underline-offset-4"
                    onClick={() => onDelete(course.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!courses.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-zinc-500">
                  {loading ? "Loading..." : "No courses found"}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {courses.map((course) => (
          <div
            key={course.id}
            className={`rounded-xl border border-zinc-200 bg-white p-3 shadow-sm ${course.id === selectedCourseId ? "ring-2 ring-indigo-200" : ""}`}
            onClick={() => onSelect(course.id)}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-zinc-900">{course.name}</p>
                <p className="text-xs text-zinc-500">{course.location}</p>
              </div>
              <span className="inline-flex rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-medium capitalize text-zinc-700">
                {course.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-700">
              {formatDateRange(course.startDate, course.endDate)}
            </p>
            <p className="text-sm text-zinc-700">
              Trainer: {course.assignedTrainer?.name ?? "Unassigned"}
            </p>
            <div className="mt-2 flex items-center justify-end gap-3 text-xs">
              <button
                className="text-indigo-600 underline decoration-dotted underline-offset-4"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(course);
                }}
              >
                Edit
              </button>
              <button
                className="text-red-600 underline decoration-dotted underline-offset-4"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(course.id);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {!courses.length ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-4 text-center text-sm text-zinc-500">
            {loading ? "Loading..." : "No courses found"}
          </div>
        ) : null}
      </div>
    </>
  );
}

