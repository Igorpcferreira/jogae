-- AlterTable
ALTER TABLE "LoginToken" ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "role" "Role";

-- CreateIndex
CREATE INDEX "LoginToken_groupId_idx" ON "LoginToken"("groupId");

-- AddForeignKey
ALTER TABLE "LoginToken" ADD CONSTRAINT "LoginToken_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FootballGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
