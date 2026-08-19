-- Bloco I — confirmação de presença por link pessoal, sem conta de jogador.
--
-- Escrita à mão de propósito: `prisma migrate dev` trava sem terminal interativo
-- quando a migration cria índice único novo (armadilha 12 do HANDOFF).
--
-- O `@default(uuid(4))` do Prisma é gerado no client, não no banco. Por isso o
-- `ADD COLUMN NOT NULL` direto estouraria nas linhas que já existem em produção:
-- a coluna nasce anulável, é preenchida com `gen_random_uuid()` (core do
-- Postgres 13+, sem extensão) e só então vira obrigatória.

-- AlterTable
ALTER TABLE "Player" ADD COLUMN "selfToken" TEXT;

UPDATE "Player" SET "selfToken" = gen_random_uuid()::text WHERE "selfToken" IS NULL;

ALTER TABLE "Player" ALTER COLUMN "selfToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Player_selfToken_key" ON "Player"("selfToken");

-- CreateEnum
CREATE TYPE "AttendanceOrigin" AS ENUM ('ORGANIZER', 'PLAYER');

-- AlterTable
-- Tem default, então é segura em tabela cheia: toda presença que já existe é
-- do organizador, que é exatamente a verdade histórica.
ALTER TABLE "Attendance" ADD COLUMN "origin" "AttendanceOrigin" NOT NULL DEFAULT 'ORGANIZER';
