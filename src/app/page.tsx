'use client';

import { DashboardProvider, useDashboard } from "@/components/dashboard/dashboard-provider";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { LoginForm } from "@/components/auth/LoginForm";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { CoursesPanel } from "@/components/dashboard/CoursesPanel";
import { TrainersPanel } from "@/components/dashboard/TrainersPanel";
import { AssignmentPanel } from "@/components/dashboard/AssignmentPanel";
import { HistoryPanel } from "@/components/dashboard/HistoryPanel";

function Toast() {
  const { toast, setToast } = useDashboard();
  if (!toast) return null;
  return (
    <div className="fixed bottom-4 right-4 flex items-center gap-3 rounded-xl bg-green-600 px-4 py-3 text-sm text-white shadow-lg ring-1 ring-green-500/60">
      <span>{toast.message}</span>
      <button className="text-xs text-zinc-300" onClick={() => setToast(null)}>
        Close
      </button>
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <MainGate />
    </AuthProvider>
  );
}

function MainGate() {
  const { user, loading: authLoading } = useAuth();
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-600">Loading session...</p>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-white px-4">
        <LoginForm />
      </div>
    );
  }
  return (
    <DashboardProvider>
      <DashboardContent />
      <Toast />
    </DashboardProvider>
  );
}

function DashboardContent() {
  const { error, refresh } = useDashboard();
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white px-4 py-6 sm:px-6 lg:px-10">
      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-indigo-700">Seminar OS</p>
          <h1 className="text-3xl font-semibold text-zinc-900">Training operations cockpit</h1>
          <p className="text-sm text-zinc-600">
            Manage courses, trainers, and assignments with conflict prevention.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="rounded-full bg-green-100 px-2 py-1 font-semibold text-green-700">
            {user?.email}
          </span>
          <button
            onClick={() => logout()}
            className="rounded-full bg-zinc-100 px-2 py-1 font-semibold text-zinc-700 hover:bg-zinc-200"
          >
            Logout
          </button>
        </div>
      </header>

      {error ? (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>{error}</span>
          <button
            className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white"
            onClick={() => refresh()}
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="space-y-4">
        <StatsBar />
        <CoursesPanel />
        <AssignmentPanel />
        <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
          <TrainersPanel />
          <HistoryPanel />
        </div>
      </div>
    </div>
  );
}
