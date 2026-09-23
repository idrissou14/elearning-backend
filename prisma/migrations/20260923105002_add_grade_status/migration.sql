-- CreateEnum
CREATE TYPE "GradeStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "grades" ADD COLUMN     "published_at" TIMESTAMP(3),
ADD COLUMN     "status" "GradeStatus" NOT NULL DEFAULT 'DRAFT';
