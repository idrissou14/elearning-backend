-- Renforcement : une inscription peut désormais cibler une seule matière
-- (CourseInstance) en plus de l'inscription pleine à un ClassGroup.

-- CreateEnum
CREATE TYPE "EnrollmentType" AS ENUM ('CURSUS', 'RENFORCEMENT');

-- L'unicité « 1 inscription par étudiant et par année » ne vaut plus que pour
-- le CURSUS : on remplace l'index unique total par un index partiel.
-- DropIndex
DROP INDEX "enrollments_user_id_academic_year_key";

-- AlterTable
ALTER TABLE "enrollments"
  ALTER COLUMN "class_group_id" DROP NOT NULL,
  ADD COLUMN "type" "EnrollmentType" NOT NULL DEFAULT 'CURSUS',
  ADD COLUMN "course_instance_id" TEXT;

-- CreateIndex
CREATE INDEX "enrollments_course_instance_id_idx" ON "enrollments"("course_instance_id");

-- CreateIndex : au plus une inscription RENFORCEMENT par étudiant et par matière.
CREATE UNIQUE INDEX "enrollments_user_id_course_instance_id_key" ON "enrollments"("user_id", "course_instance_id");

-- CreateIndex : au plus une inscription CURSUS par étudiant et par année.
CREATE UNIQUE INDEX "enrollments_user_id_academic_year_cursus_key" ON "enrollments"("user_id", "academic_year") WHERE "type" = 'CURSUS';

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_instance_id_fkey" FOREIGN KEY ("course_instance_id") REFERENCES "course_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
