/*
  Warnings:

  - You are about to drop the column `threshold` on the `RoleThreshold` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RoleThreshold" DROP COLUMN "threshold",
ADD COLUMN     "conditions" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "OwnedAsset" (
    "id" TEXT NOT NULL,
    "assetName" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "OwnedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OwnedAsset_userId_assetName_key" ON "OwnedAsset"("userId", "assetName");

-- AddForeignKey
ALTER TABLE "OwnedAsset" ADD CONSTRAINT "OwnedAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("discordId") ON DELETE CASCADE ON UPDATE CASCADE;
