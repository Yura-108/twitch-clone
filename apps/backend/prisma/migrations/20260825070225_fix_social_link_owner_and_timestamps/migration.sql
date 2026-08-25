/*
  Warnings:

  - You are about to drop the column `update_at` on the `social_links` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `social_links` table without a default value. This is not possible if the table is not empty.
  - Made the column `user_id` on table `social_links` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "social_links" DROP COLUMN "update_at",
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "user_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "social_links_user_id_position_idx" ON "social_links"("user_id", "position");
