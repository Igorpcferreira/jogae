-- "Escolha da galera": o craque votado pelo grupo (plano §27, Fase 2).
--
-- Convive com o craque calculado (`mvpDaRodada`) em vez de substituí-lo. O
-- cálculo usa participação em gol e, por construção, nunca premia goleiro nem
-- zagueiro — quem fez dez defesas não aparece numa conta de gol + assistência.
-- A votação não corrige um erro do cálculo, corrige um limite dele.
--
-- O voto é **secreto**: o par votante→votado existe nesta tabela porque é o que
-- garante um voto por pessoa, e não sai daqui. A apuração devolve só o
-- vencedor.

-- Quando o apito final soou. `endsAt` não serve: aquele é o fim **previsto**,
-- calculado do formato do grupo, e existe desde antes de a bola rolar. A janela
-- de votação precisa do instante real do encerramento.
--
-- Nulo nas rodadas já encerradas: não dá pra inventar a hora em que alguém
-- apertou "encerrar rodada" semanas atrás. A consulta cai na data da rodada
-- nesses casos, e como a janela é de 48h, rodada antiga nasce com a votação já
-- fechada — que é o comportamento certo.
ALTER TABLE "Round" ADD COLUMN "finishedAt" TIMESTAMP(3);

CREATE TABLE "MvpVote" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "voterPlayerId" TEXT NOT NULL,
    "votedPlayerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MvpVote_pkey" PRIMARY KEY ("id")
);

-- Um voto por pessoa por rodada. A regra vive no banco e não só na action:
-- clique repetido no 4G do estacionamento chega duas vezes.
CREATE UNIQUE INDEX "MvpVote_roundId_voterPlayerId_key" ON "MvpVote"("roundId", "voterPlayerId");

-- A apuração lê por rodada e agrupa por votado.
CREATE INDEX "MvpVote_roundId_votedPlayerId_idx" ON "MvpVote"("roundId", "votedPlayerId");

ALTER TABLE "MvpVote" ADD CONSTRAINT "MvpVote_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MvpVote" ADD CONSTRAINT "MvpVote_voterPlayerId_fkey" FOREIGN KEY ("voterPlayerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MvpVote" ADD CONSTRAINT "MvpVote_votedPlayerId_fkey" FOREIGN KEY ("votedPlayerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
