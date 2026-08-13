-- Idempotência da fila offline de gols (plano §40).
-- O celular gera o id antes de ter rede; a sincronização pode repetir o envio
-- e o índice único garante que o gol entra uma vez só.
ALTER TABLE "MatchEvent" ADD COLUMN "clientEventId" TEXT;

CREATE UNIQUE INDEX "MatchEvent_clientEventId_key" ON "MatchEvent"("clientEventId");
