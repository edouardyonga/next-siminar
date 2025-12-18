-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('draft', 'scheduled', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "Trainer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "trainingSubjects" TEXT[],
    "availabilityRanges" JSONB,
    "hourlyRate" DECIMAL(65,30),
    "rating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "subject" TEXT[],
    "location" TEXT NOT NULL,
    "participants" INTEGER NOT NULL,
    "notes" TEXT,
    "price" DECIMAL(65,30) NOT NULL,
    "trainerPrice" DECIMAL(65,30) NOT NULL,
    "status" "CourseStatus" NOT NULL DEFAULT 'draft',
    "assignedTrainerId" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentHistory" (
    "id" SERIAL NOT NULL,
    "courseId" INTEGER NOT NULL,
    "trainerId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trainer_email_key" ON "Trainer"("email");

-- CreateIndex
CREATE INDEX "Course_startDate_idx" ON "Course"("startDate");

-- CreateIndex
CREATE INDEX "Course_location_idx" ON "Course"("location");

-- CreateIndex
CREATE INDEX "Course_status_idx" ON "Course"("status");

-- CreateIndex
CREATE INDEX "AssignmentHistory_courseId_idx" ON "AssignmentHistory"("courseId");

-- CreateIndex
CREATE INDEX "AssignmentHistory_trainerId_idx" ON "AssignmentHistory"("trainerId");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_assignedTrainerId_fkey" FOREIGN KEY ("assignedTrainerId") REFERENCES "Trainer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentHistory" ADD CONSTRAINT "AssignmentHistory_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentHistory" ADD CONSTRAINT "AssignmentHistory_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
