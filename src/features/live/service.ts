import type { Db } from "@/db/types";

/**
 * O que o modo ao vivo faz com o banco. Sem `revalidatePath` e sem sessão:
 * a action autoriza e revalida, aqui é só I/O — testável contra Postgres.
 */

/** Cria e já inicia a partida — no campo não existe passo intermediário. */
export async function iniciarPartida(
  db: Db,
  roundId: string,
  teamAId: string,
  teamBId: string,
) {
  if (teamAId === teamBId) throw new Error("Um time não joga contra ele mesmo");

  // Os dois times precisam ser desta rodada — senão dá pra colar um time de
  // outro grupo passando o id na mão.
  const times = await db.team.count({
    where: { roundId, id: { in: [teamAId, teamBId] } },
  });
  if (times !== 2) throw new Error("Time não pertence a esta rodada");

  const [quantas, emAndamento] = await Promise.all([
    db.match.count({ where: { roundId } }),
    db.match.findFirst({ where: { roundId, status: "LIVE" } }),
  ]);

  if (emAndamento) {
    await db.match.update({
      where: { id: emAndamento.id },
      data: { status: "FINISHED", endedAt: new Date() },
    });
  }

  const partida = await db.match.create({
    data: {
      roundId,
      teamAId,
      teamBId,
      order: quantas,
      status: "LIVE",
      startedAt: new Date(),
    },
  });

  await db.round.update({ where: { id: roundId }, data: { status: "LIVE" } });

  return partida;
}

/**
 * Registrar gol é a ação mais crítica do produto: precisa ser atômica e
 * refletir no placar imediatamente.
 */
export async function registrarGol(
  db: Db,
  input: {
    matchId: string;
    teamId: string;
    playerId?: string | null;
    assistPlayerId?: string | null;
    ownGoal?: boolean;
    /** Minuto vindo do cliente offline; sem ele, calcula pelo cronômetro. */
    minute?: number | null;
    /** Id gerado no celular: a mesma fila reenviada não vira dois gols. */
    clientEventId?: string | null;
  },
) {
  // Reenvio da fila offline: se o gol já entrou, devolve o mesmo evento em
  // vez de incrementar o placar de novo.
  if (input.clientEventId) {
    const jaGravado = await db.matchEvent.findUnique({
      where: { clientEventId: input.clientEventId },
    });
    if (jaGravado) return jaGravado;
  }

  const partida = await db.match.findUniqueOrThrow({ where: { id: input.matchId } });
  if (partida.status === "FINISHED") throw new Error("Partida já encerrada");

  const ehTimeA = partida.teamAId === input.teamId;
  if (!ehTimeA && partida.teamBId !== input.teamId) {
    throw new Error("Time não participa desta partida");
  }

  const minuto =
    input.minute ??
    (partida.startedAt
      ? Math.max(1, Math.floor((Date.now() - partida.startedAt.getTime()) / 60_000) + 1)
      : null);

  const [evento] = await db.$transaction([
    db.matchEvent.create({
      data: {
        matchId: input.matchId,
        teamId: input.teamId,
        type: input.ownGoal ? "OWN_GOAL" : "GOAL",
        playerId: input.playerId ?? null,
        assistPlayerId: input.assistPlayerId ?? null,
        minute: minuto,
        clientEventId: input.clientEventId ?? null,
      },
    }),
    db.match.update({
      where: { id: input.matchId },
      data: ehTimeA ? { scoreA: { increment: 1 } } : { scoreB: { increment: 1 } },
    }),
  ]);

  return evento;
}

/** Desfazer é soft-delete: o lance some do placar mas fica no rastro. */
export async function desfazerUltimoLance(db: Db, matchId: string): Promise<boolean> {
  const evento = await db.matchEvent.findFirst({
    where: { matchId, voidedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!evento) return false;

  const partida = await db.match.findUniqueOrThrow({ where: { id: matchId } });
  const ehTimeA = partida.teamAId === evento.teamId;

  await db.$transaction([
    db.matchEvent.update({ where: { id: evento.id }, data: { voidedAt: new Date() } }),
    db.match.update({
      where: { id: matchId },
      data: ehTimeA ? { scoreA: { decrement: 1 } } : { scoreB: { decrement: 1 } },
    }),
  ]);

  return true;
}

export async function encerrarPartida(db: Db, matchId: string) {
  await db.match.update({
    where: { id: matchId },
    data: { status: "FINISHED", endedAt: new Date() },
  });
}

export async function encerrarRodada(db: Db, roundId: string) {
  // O mesmo instante nas duas escritas: `finishedAt` é o apito final, e é dele
  // que a votação de craque conta as 48h (`domain/mvp/votacao.ts`). Dois
  // `new Date()` diferentes dariam dois "fins" pra mesma rodada.
  const apito = new Date();

  await db.$transaction([
    db.match.updateMany({
      where: { roundId, status: "LIVE" },
      data: { status: "FINISHED", endedAt: apito },
    }),
    db.round.update({
      where: { id: roundId },
      data: { status: "FINISHED", finishedAt: apito },
    }),
  ]);
}
