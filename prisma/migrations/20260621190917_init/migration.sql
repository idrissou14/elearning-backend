/*
  Warnings:

  - You are about to drop the column `class_id` on the `enrollments` table. All the data in the column will be lost.
  - The `status` column on the `enrollments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `course_id` on the `grades` table. All the data in the column will be lost.
  - You are about to drop the column `quiz_id` on the `grades` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `grades` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `grades` table. All the data in the column will be lost.
  - You are about to drop the column `refresh_token` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the `class_courses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `classes` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[user_id,academic_year]` on the table `enrollments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[enrollment_id,evaluation_id]` on the table `grades` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[refresh_token_hash]` on the table `sessions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `academic_year` to the `enrollments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `class_group_id` to the `enrollments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `evaluation_id` to the `grades` table without a default value. This is not possible if the table is not empty.
  - Added the required column `score` to the `grades` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refresh_token_hash` to the `sessions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Semester" AS ENUM ('S1', 'S2');

-- CreateEnum
CREATE TYPE "ClassStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'WITHDRAWN', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CourseTeacherRole" AS ENUM ('MAIN_TEACHER', 'ASSISTANT', 'GUEST');

-- CreateEnum
CREATE TYPE "EvaluationType" AS ENUM ('CC', 'TP', 'EXAM', 'PROJECT');

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actor_id_fkey";

-- DropForeignKey
ALTER TABLE "class_courses" DROP CONSTRAINT "class_courses_class_id_fkey";

-- DropForeignKey
ALTER TABLE "classes" DROP CONSTRAINT "classes_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments_class_id_fkey";

-- DropForeignKey
ALTER TABLE "grades" DROP CONSTRAINT "grades_enrollment_id_fkey";

-- DropIndex
DROP INDEX "enrollments_user_id_class_id_key";

-- DropIndex
DROP INDEX "sessions_refresh_token_key";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "actor_email" TEXT;

-- AlterTable
ALTER TABLE "enrollments" DROP COLUMN "class_id",
ADD COLUMN     "academic_year" TEXT NOT NULL,
ADD COLUMN     "class_group_id" TEXT NOT NULL,
ADD COLUMN     "previous_enrollment_id" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "grades" DROP COLUMN "course_id",
DROP COLUMN "quiz_id",
DROP COLUMN "value",
DROP COLUMN "weight",
ADD COLUMN     "evaluation_id" TEXT NOT NULL,
ADD COLUMN     "score" DECIMAL(5,2) NOT NULL;

-- AlterTable
ALTER TABLE "sessions" DROP COLUMN "refresh_token",
ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "refresh_token_hash" TEXT NOT NULL;

-- DropTable
DROP TABLE "class_courses";

-- DropTable
DROP TABLE "classes";

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_levels" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "level_name" TEXT NOT NULL,
    "level_order" INTEGER NOT NULL,

    CONSTRAINT "program_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_courses" (
    "id" TEXT NOT NULL,
    "program_level_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "semester" "Semester" NOT NULL,
    "credits" INTEGER NOT NULL,
    "coefficient" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_groups" (
    "id" TEXT NOT NULL,
    "program_level_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "status" "ClassStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_instances" (
    "id" TEXT NOT NULL,
    "curriculum_course_id" TEXT NOT NULL,
    "class_group_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "content_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_teachers" (
    "id" TEXT NOT NULL,
    "course_instance_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "role" "CourseTeacherRole" NOT NULL DEFAULT 'MAIN_TEACHER',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "course_instance_id" TEXT NOT NULL,
    "type" "EvaluationType" NOT NULL,
    "name" TEXT NOT NULL,
    "weight" DECIMAL(3,2) NOT NULL,
    "max_score" DECIMAL(5,2) NOT NULL DEFAULT 20.0,
    "quiz_ref" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "s3_path" TEXT NOT NULL,
    "verify_token" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "programs_code_key" ON "programs"("code");

-- CreateIndex
CREATE INDEX "programs_department_id_idx" ON "programs"("department_id");

-- CreateIndex
CREATE INDEX "program_levels_program_id_idx" ON "program_levels"("program_id");

-- CreateIndex
CREATE UNIQUE INDEX "program_levels_program_id_level_name_key" ON "program_levels"("program_id", "level_name");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_courses_code_key" ON "curriculum_courses"("code");

-- CreateIndex
CREATE INDEX "curriculum_courses_program_level_id_idx" ON "curriculum_courses"("program_level_id");

-- CreateIndex
CREATE INDEX "curriculum_courses_semester_idx" ON "curriculum_courses"("semester");

-- CreateIndex
CREATE INDEX "class_groups_program_level_id_idx" ON "class_groups"("program_level_id");

-- CreateIndex
CREATE INDEX "class_groups_academic_year_idx" ON "class_groups"("academic_year");

-- CreateIndex
CREATE UNIQUE INDEX "class_groups_program_level_id_name_academic_year_key" ON "class_groups"("program_level_id", "name", "academic_year");

-- CreateIndex
CREATE INDEX "course_instances_class_group_id_idx" ON "course_instances"("class_group_id");

-- CreateIndex
CREATE INDEX "course_instances_academic_year_idx" ON "course_instances"("academic_year");

-- CreateIndex
CREATE UNIQUE INDEX "course_instances_curriculum_course_id_class_group_id_academ_key" ON "course_instances"("curriculum_course_id", "class_group_id", "academic_year");

-- CreateIndex
CREATE INDEX "course_teachers_teacher_id_idx" ON "course_teachers"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_teachers_course_instance_id_teacher_id_key" ON "course_teachers"("course_instance_id", "teacher_id");

-- CreateIndex
CREATE INDEX "evaluations_course_instance_id_idx" ON "evaluations"("course_instance_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_verify_token_key" ON "certificates"("verify_token");

-- CreateIndex
CREATE INDEX "certificates_enrollment_id_idx" ON "certificates"("enrollment_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "enrollments_class_group_id_idx" ON "enrollments"("class_group_id");

-- CreateIndex
CREATE INDEX "enrollments_academic_year_idx" ON "enrollments"("academic_year");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_user_id_academic_year_key" ON "enrollments"("user_id", "academic_year");

-- CreateIndex
CREATE INDEX "grades_enrollment_id_idx" ON "grades"("enrollment_id");

-- CreateIndex
CREATE INDEX "grades_evaluation_id_idx" ON "grades"("evaluation_id");

-- CreateIndex
CREATE UNIQUE INDEX "grades_enrollment_id_evaluation_id_key" ON "grades"("enrollment_id", "evaluation_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_hash_key" ON "sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_levels" ADD CONSTRAINT "program_levels_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_courses" ADD CONSTRAINT "curriculum_courses_program_level_id_fkey" FOREIGN KEY ("program_level_id") REFERENCES "program_levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_program_level_id_fkey" FOREIGN KEY ("program_level_id") REFERENCES "program_levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_instances" ADD CONSTRAINT "course_instances_curriculum_course_id_fkey" FOREIGN KEY ("curriculum_course_id") REFERENCES "curriculum_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_instances" ADD CONSTRAINT "course_instances_class_group_id_fkey" FOREIGN KEY ("class_group_id") REFERENCES "class_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_teachers" ADD CONSTRAINT "course_teachers_course_instance_id_fkey" FOREIGN KEY ("course_instance_id") REFERENCES "course_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_teachers" ADD CONSTRAINT "course_teachers_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_class_group_id_fkey" FOREIGN KEY ("class_group_id") REFERENCES "class_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_previous_enrollment_id_fkey" FOREIGN KEY ("previous_enrollment_id") REFERENCES "enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_course_instance_id_fkey" FOREIGN KEY ("course_instance_id") REFERENCES "course_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
