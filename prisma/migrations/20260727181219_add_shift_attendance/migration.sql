-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Activity" ADD VALUE 'SHIFT_CHECK_IN';
ALTER TYPE "Activity" ADD VALUE 'SHIFT_CHECK_OUT';

-- CreateTable
CREATE TABLE "ShiftAttendance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shiftInstanceId" TEXT,
    "locationId" TEXT,
    "checkInAt" TIMESTAMP(3) NOT NULL,
    "checkOutAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "checkInActivityId" TEXT,
    "checkOutActivityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShiftAttendance_userId_checkInAt_idx" ON "ShiftAttendance"("userId", "checkInAt");

-- CreateIndex
CREATE INDEX "ShiftAttendance_locationId_checkInAt_idx" ON "ShiftAttendance"("locationId", "checkInAt");

-- CreateIndex
CREATE INDEX "ShiftAttendance_shiftInstanceId_idx" ON "ShiftAttendance"("shiftInstanceId");

-- AddForeignKey
ALTER TABLE "ShiftAttendance" ADD CONSTRAINT "ShiftAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAttendance" ADD CONSTRAINT "ShiftAttendance_shiftInstanceId_fkey" FOREIGN KEY ("shiftInstanceId") REFERENCES "ShiftInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAttendance" ADD CONSTRAINT "ShiftAttendance_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
