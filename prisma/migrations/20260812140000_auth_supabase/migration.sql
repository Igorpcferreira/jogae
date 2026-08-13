-- Auth passa a ser do Supabase: a sessão vive no cookie assinado dele, não aqui.
-- DropTable
DROP TABLE "Session";

-- O magic link próprio deixa de existir; o que sobra do LoginToken é o convite,
-- que não precisa mais de token (a verificação do e-mail é do provedor de auth).
-- DropTable
DROP TABLE "LoginToken";

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Invite_email_consumedAt_idx" ON "Invite"("email", "consumedAt");

-- CreateIndex
CREATE INDEX "Invite_groupId_idx" ON "Invite"("groupId");

-- CreateIndex
CREATE INDEX "Invite_expiresAt_idx" ON "Invite"("expiresAt");

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FootballGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "authId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_authId_key" ON "User"("authId");
