export type CourseStatus = "draft" | "scheduled" | "completed" | "cancelled";

export type TrainerAvailability = {
  start: string;
  end: string;
};

export type Trainer = {
  id: number;
  name: string;
  email: string;
  location: string;
  trainingSubjects: string[];
  availabilityRanges?: TrainerAvailability[] | null;
  hourlyRate?: number | null;
  rating?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type Course = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  subject: string[];
  location: string;
  participants: number;
  notes?: string | null;
  price: number;
  trainerPrice: number;
  status: CourseStatus;
  assignedTrainerId?: number | null;
  assignedTrainer?: Trainer | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Conflict = {
  type: "location" | "trainer";
  courseId: number;
  courseName: string;
  reason: string;
};

export type AssignmentHistory = {
  id: number;
  courseId: number;
  trainerId: number;
  action: string;
  actor?: string | null;
  createdAt: string;
  course?: Course;
  trainer?: Trainer;
};

export type AuthUser = {
  email: string;
  role: "admin";
};

export type CoursePayload = Omit<
  Course,
  "id" | "createdAt" | "updatedAt" | "deletedAt" | "assignedTrainer" | "status"
> & { status?: CourseStatus };

export type TrainerPayload = Omit<
  Trainer,
  "id" | "createdAt" | "updatedAt" | "availabilityRanges"
> & { availabilityRanges?: TrainerAvailability[] };


