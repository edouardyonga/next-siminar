'use client';

import { useEffect, useMemo, useState } from "react";
import { CourseForm } from "./CourseForm";
import { useDashboard } from "./dashboard-provider";
import { Course } from "@/lib/types";
import { formatDateRange, formatMoney } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { CourseList } from "./CourseList";
import { PaginationBar } from "./PaginationBar";

type SortKey = "startDate" | "status" | "location";

export function CoursesPanel() {
  const {
    courses,
    trainers,
    deleteCourse,
    selectedCourseId,
    selectCourse,
    loading,
  } = useDashboard();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("startDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "assigned" | "unassigned">(
    "all",
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const locations = useMemo(
    () =>
      Array.from(
        new Set(
          courses
            .map((c) => c.location)
            .filter((loc): loc is string => Boolean(loc && loc.trim()))
            .map((loc) => loc.trim()),
        ),
      ),
    [courses],
  );

  const filteredCourses = useMemo(() => {
    const items = courses.filter((c) => {
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.subject.some((s) => s.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = status === "all" ? true : c.status === status;
      const matchesLocation = locationFilter === "all" ? true : c.location === locationFilter;
      const matchesAssignment =
        assignmentFilter === "all"
          ? true
          : assignmentFilter === "assigned"
            ? Boolean(c.assignedTrainerId)
            : !c.assignedTrainerId;
      return matchesSearch && matchesStatus && matchesLocation && matchesAssignment;
    });

    const sorted = [...items].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortBy) {
        case "status":
          return a.status.localeCompare(b.status) * dir;
        case "location":
          return a.location.localeCompare(b.location) * dir;
        case "startDate":
        default:
          return (new Date(a.startDate).getTime() - new Date(b.startDate).getTime()) * dir;
      }
    });
    return sorted;
  }, [courses, search, status, sortBy, sortDir, locationFilter, assignmentFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, status, sortBy, sortDir, locationFilter, assignmentFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedCourses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCourses.slice(start, start + pageSize);
  }, [filteredCourses, currentPage, pageSize]);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  );

  const handleDelete = async (courseId: number) => {
    if (!confirm("Delete course? This performs a soft delete.")) return;
    const res = await deleteCourse(courseId);
    if (!res.ok && res.message) setActionError(res.message);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Courses</p>
          <h2 className="text-xl font-semibold text-zinc-900">Course pipeline</h2>
          <p className="text-sm text-zinc-500">
            Filter, sort, and manage courses with conflict-aware editing.
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
          onClick={() => {
            setEditCourse(null);
            setShowFormModal(true);
          }}
        >
          + New course
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.3fr,1fr]">
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            <input
              aria-label="Search by name or subject"
              placeholder="Search by name or subject"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="Filter by course status"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              aria-label="Sort courses"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
            >
              <option value="startDate">Sort by start date</option>
              <option value="status">Sort by status</option>
              <option value="location">Sort by location</option>
            </select>
            <select
              aria-label="Sort direction"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
            <select
              aria-label="Filter by course location"
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
            <select
              aria-label="Filter by assignment status"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value as typeof assignmentFilter)}
            >
              <option value="all">All assignments</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>

          <CourseList
            courses={paginatedCourses}
            selectedCourseId={selectedCourseId}
            loading={loading}
            onSelect={(id) => selectCourse(id)}
            onEdit={(course) => {
              setEditCourse(course);
              setShowFormModal(true);
            }}
            onDelete={handleDelete}
          />
          <PaginationBar
            id="courses-pagination"
            page={currentPage}
            pageSize={pageSize}
            total={filteredCourses.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
          {actionError ? (
            <p className="text-sm text-red-600" role="status" aria-live="polite">
              {actionError}
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <CourseDetailsCard course={selectedCourse} />
        </div>
      </div>

      <Modal
        open={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditCourse(null);
        }}
        title={editCourse ? "Edit course" : "Create course"}
        widthClass="max-w-3xl"
      >
        <CourseForm
          trainers={trainers}
          initial={editCourse}
          onSaved={() => {
            setShowFormModal(false);
            setEditCourse(null);
          }}
          onCancel={() => {
            setShowFormModal(false);
            setEditCourse(null);
          }}
        />
      </Modal>
    </div>
  );
}

function CourseDetailsCard({ course }: { course: Course | null }) {
  if (!course) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-4 text-sm text-zinc-500">
        Select a course to view details.
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Course details</p>
          <h3 className="text-lg font-semibold text-zinc-900">{course.name}</h3>
        </div>
        <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium capitalize text-zinc-700">
          {course.status}
        </span>
      </div>

      <p className="text-sm text-zinc-600">{course.notes || "No notes"}</p>

      <dl className="grid grid-cols-2 gap-3 text-sm text-zinc-700">
        <Detail label="When" value={formatDateRange(course.startDate, course.endDate)} />
        <Detail label="Location" value={course.location} />
        <Detail
          label="Subjects"
          value={
            <div className="flex flex-wrap gap-1">
              {course.subject.map((s) => (
                <span key={s} className="rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-700">
                  {s}
                </span>
              ))}
            </div>
          }
        />
        <Detail label="Participants" value={course.participants} />
        <Detail
          label="Trainer"
          value={course.assignedTrainer?.name ?? "Unassigned"}
        />
        <Detail
          label="Financials"
          value={`${formatMoney(course.price)} / trainer ${formatMoney(course.trainerPrice)}`}
        />
      </dl>
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


