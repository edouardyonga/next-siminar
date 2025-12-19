'use client';

import { useMemo } from "react";
import { useDashboard } from "./dashboard-provider";
import { formatDate } from "@/lib/format";

export function HistoryPanel() {
  const { history, selectedCourseId, selectedTrainerId } = useDashboard();

  const filtered = useMemo(() => {
    return history.filter((item) => {
      if (selectedCourseId && item.courseId !== selectedCourseId) return false;
      if (selectedTrainerId && item.trainerId !== selectedTrainerId) return false;
      return true;
    });
  }, [history, selectedCourseId, selectedTrainerId]);

  return (
    <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Assignment history</p>
          <h3 className="text-lg font-semibold text-zinc-900">Recent actions</h3>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length ? (
          filtered.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
            >
              <div>
                <p className="font-medium text-zinc-900">
                  {item.action} • {item.course?.name ?? `Course ${item.courseId}`}
                </p>
                <p className="text-xs text-zinc-500">
                  Trainer {item.trainer?.name ?? item.trainerId} • {item.actor ?? "system"}
                </p>
              </div>
              <span className="text-xs text-zinc-500">{formatDate(item.createdAt)}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-500">No assignment changes yet.</p>
        )}
      </div>
    </div>
  );
}


