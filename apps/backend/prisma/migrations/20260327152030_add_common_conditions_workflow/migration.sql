-- CreateEnum
CREATE TYPE "CommonConditionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REJECTED', 'PUBLISHED');

-- AlterTable
ALTER TABLE "CommonCondition" ADD COLUMN     "approved_by_id" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "status" "CommonConditionStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN     "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "CommonCondition" ADD CONSTRAINT "CommonCondition_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommonCondition" ADD CONSTRAINT "CommonCondition_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
