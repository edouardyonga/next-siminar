import { z } from "zod";

export const courseSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  subject: z.array(z.string().min(1)).min(1),
  location: z.string().min(1),
  participants: z.number().int().positive(),
  notes: z.string().optional(),
  price: z.number().nonnegative(),
  trainerPrice: z.number().nonnegative(),
  status: z.enum(["draft", "scheduled", "completed", "cancelled"]).optional(),
  assignedTrainerId: z.number().int().optional(),
});

export const trainerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  location: z.string().min(1),
  trainingSubjects: z.array(z.string().min(1)).min(1),
  availabilityRanges: z
    .array(
      z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      }),
    )
    .optional(),
  hourlyRate: z.number().nonnegative().optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

