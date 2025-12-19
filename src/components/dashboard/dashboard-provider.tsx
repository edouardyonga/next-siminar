'use client';

import { courseSchema, trainerSchema } from "@/lib/validation";
import {
  AssignmentHistory,
  Conflict,
  Course,
  CoursePayload,
  Trainer,
  TrainerPayload,
} from "@/lib/types";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type DashboardContextValue = {
  courses: Course[];
  trainers: Trainer[];
  history: AssignmentHistory[];
  loading: boolean;
  error: string | null;
  selectedCourseId: number | null;
  selectedTrainerId: number | null;
  selectCourse: (id: number | null) => void;
  selectTrainer: (id: number | null) => void;
  refresh: () => Promise<void>;
  upsertCourse: (
    payload: CoursePayload,
    opts?: { courseId?: number; allowOverride?: boolean },
  ) => Promise<{ ok: boolean; conflicts?: Conflict[]; message?: string }>;
  deleteCourse: (courseId: number) => Promise<{ ok: boolean; message?: string }>;
  upsertTrainer: (
    payload: TrainerPayload,
    opts?: { trainerId?: number },
  ) => Promise<{ ok: boolean; message?: string }>;
  deleteTrainer: (trainerId: number) => Promise<{ ok: boolean; message?: string }>;
  assignTrainer: (
    courseId: number,
    trainerId: number,
    opts?: { allowOverride?: boolean },
  ) => Promise<{ ok: boolean; conflicts?: Conflict[]; message?: string }>;
  setToast: (toast: Toast | null) => void;
  toast: Toast | null;
};

export type Toast = { type: "success" | "error" | "info"; message: string };

const DashboardContext = createContext<DashboardContextValue | null>(null);

async function parseJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [history, setHistory] = useState<AssignmentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedTrainerId, setSelectedTrainerId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [coursesRes, trainersRes, historyRes] = await Promise.all([
        fetch("/api/courses", { cache: "no-store" }),
        fetch("/api/trainers", { cache: "no-store" }),
        fetch("/api/assignments", { cache: "no-store" }),
      ]);

      if (!coursesRes.ok) throw new Error("Failed to load courses");
      if (!trainersRes.ok) throw new Error("Failed to load trainers");
      if (!historyRes.ok) throw new Error("Failed to load assignments");

      const coursesJson = await coursesRes.json();
      const trainersJson = await trainersRes.json();
      const historyJson = await historyRes.json();

      setCourses(coursesJson.courses ?? []);
      setTrainers(trainersJson.trainers ?? []);
      setHistory(historyJson.history ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load data";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const upsertCourse = useCallback(
    async (
      payload: CoursePayload,
      opts?: { courseId?: number; allowOverride?: boolean },
    ) => {
      const { courseId, allowOverride } = opts ?? {};
      const parsed = courseSchema.safeParse({
        ...payload,
        startDate: payload.startDate,
        endDate: payload.endDate,
        assignedTrainerId:
          payload.assignedTrainerId !== undefined && payload.assignedTrainerId !== null
            ? Number(payload.assignedTrainerId)
            : undefined,
      });

      if (!parsed.success) {
        return {
          ok: false,
          message: parsed.error.issues.map((i) => i.message).join(", "),
        };
      }

      const endpoint = courseId ? `/api/courses/${courseId}` : "/api/courses";
      const method = courseId ? "PUT" : "POST";

      try {
        const res = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...parsed.data, allowOverride }),
        });

        const body = await parseJson(res);

        if (res.status === 409 && body.conflicts) {
          return { ok: false, conflicts: body.conflicts as Conflict[] };
        }

        if (!res.ok) {
          return {
            ok: false,
            message: body?.error?.message ?? "Failed to save course",
          };
        }

        await refresh();
        setToast({ type: "success", message: `Course ${courseId ? "updated" : "created"}` });
        return { ok: true, conflicts: body.conflicts as Conflict[] | undefined };
      } catch (err) {
        return {
          ok: false,
          message: err instanceof Error ? err.message : "Failed to save course",
        };
      }
    },
    [refresh],
  );

  const deleteCourse = useCallback(
    async (courseId: number) => {
      try {
        const res = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
        const body = await parseJson(res);
        if (!res.ok) {
          return { ok: false, message: body?.error?.message ?? "Failed to delete course" };
        }
        await refresh();
        setToast({ type: "info", message: "Course deleted (soft delete)" });
        if (selectedCourseId === courseId) setSelectedCourseId(null);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: err instanceof Error ? err.message : "Failed to delete course",
        };
      }
    },
    [refresh, selectedCourseId],
  );

  const upsertTrainer = useCallback(
    async (payload: TrainerPayload, opts?: { trainerId?: number }) => {
      const { trainerId } = opts ?? {};
      const parsed = trainerSchema.safeParse(payload);
      if (!parsed.success) {
        return {
          ok: false,
          message: parsed.error.issues.map((i) => i.message).join(", "),
        };
      }

      const endpoint = trainerId ? `/api/trainers/${trainerId}` : "/api/trainers";
      const method = trainerId ? "PUT" : "POST";

      try {
        const res = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });

        const body = await parseJson(res);
        if (!res.ok) {
          return { ok: false, message: body?.error?.message ?? "Failed to save trainer" };
        }
        await refresh();
        setToast({ type: "success", message: `Trainer ${trainerId ? "updated" : "created"}` });
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: err instanceof Error ? err.message : "Failed to save trainer",
        };
      }
    },
    [refresh],
  );

  const deleteTrainer = useCallback(
    async (trainerId: number) => {
      try {
        const res = await fetch(`/api/trainers/${trainerId}`, { method: "DELETE" });
        const body = await parseJson(res);
        if (!res.ok) {
          return { ok: false, message: body?.error?.message ?? "Failed to delete trainer" };
        }
        await refresh();
        setToast({
          type: "info",
          message: "Trainer deleted; assigned courses were unassigned",
        });
        if (selectedTrainerId === trainerId) setSelectedTrainerId(null);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: err instanceof Error ? err.message : "Failed to delete trainer",
        };
      }
    },
    [refresh, selectedTrainerId],
  );

  const assignTrainer = useCallback(
    async (courseId: number, trainerId: number, opts?: { allowOverride?: boolean }) => {
      try {
        const res = await fetch(`/api/courses/${courseId}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trainerId, allowOverride: opts?.allowOverride }),
        });
        const body = await parseJson(res);

        if (res.status === 409 && body?.conflicts) {
          return { ok: false, conflicts: body.conflicts as Conflict[] };
        }

        if (!res.ok) {
          return { ok: false, message: body?.error?.message ?? "Failed to assign trainer" };
        }

        await refresh();
        setToast({ type: "success", message: "Trainer assigned" });
        setSelectedTrainerId(trainerId);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: err instanceof Error ? err.message : "Failed to assign trainer",
        };
      }
    },
    [refresh],
  );

  const value: DashboardContextValue = useMemo(
    () => ({
      courses,
      trainers,
      history,
      loading,
      error,
      selectedCourseId,
      selectedTrainerId,
      selectCourse: setSelectedCourseId,
      selectTrainer: setSelectedTrainerId,
      refresh,
      upsertCourse,
      deleteCourse,
      upsertTrainer,
      deleteTrainer,
      assignTrainer,
      toast,
      setToast,
    }),
    [
      courses,
      trainers,
      history,
      loading,
      error,
      selectedCourseId,
      selectedTrainerId,
      refresh,
      upsertCourse,
      deleteCourse,
      upsertTrainer,
      deleteTrainer,
      assignTrainer,
      toast,
    ],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}


