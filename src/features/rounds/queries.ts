import "server-only";
import { cache } from "react";
import { prisma } from "@/db/client";
import type { Prisma } from "@/db/generated/client";
import {
  aggregatePlayerStats,
  mvpDaRodada,
  type StatEvent,
  type StatMatch,
  type StatRoster,
} from "@/domain/statistics/aggregate";
import { timesAnteriores } from "./service";

const roundInclude = {
  group: true,
  attendances: {
    include: { player: true },
    orderBy: [{ status: "asc" }, { order: "asc" }],
  },
  teams: {
    orderBy: { order: "asc" },
    include: {
      players: { include: { player: true } },
    },
  },
  matches: {
    orderBy: { order: "asc" },
    include: {
      teamA: true,
      teamB: true,
      events: {
        orderBy: { createdAt: "desc" },
        include: { player: true, assistPlayer: true, team: true },
      },
    },
  },
} satisfies Prisma.RoundInclude;

export type RoundDetail = NonNullable<Awaited<ReturnType<typeof getRoundDetail>>>;

export const getRoundDetail = cache(async (roundId: string) => {
  return prisma.round.findUnique({ where: { id: roundId }, include: roundInclude });
});

export const getRoundByToken = cache(async (publicToken: string) => {
  return prisma.round.findUnique({ where: { publicToken }, include: roundInclude });
});

/**
 * Qual rodada a interface mostra: a que está ao vivo, senão a próxima aberta,
 * senão a última encerrada.
 *
 * Só o id, e as três buscas em paralelo. Antes cada tentativa vinha com o
 * `include` inteiro e uma esperava a outra — trazer duas rodadas completas
 * (presenças, times, partidas, lances) do outro lado da rede pra descartar
 * ambas era o gargalo de toda navegação.
 */
export const getCurrentRoundId = cache(async (groupId: string) => {
  const [live, upcoming, last] = await Promise.all([
    prisma.round.findFirst({
      where: { groupId, status: "LIVE" },
      orderBy: { date: "desc" },
      select: { id: true },
    }),
    prisma.round.findFirst({
      where: { groupId, status: { in: ["OPEN", "CONFIRMED"] } },
      orderBy: { date: "asc" },
      select: { id: true },
    }),
    prisma.round.findFirst({
      where: { groupId },
      orderBy: { date: "desc" },
      select: { id: true },
    }),
  ]);

  return (live ?? upcoming ?? last)?.id ?? null;
});

/**
 * A rodada corrente com tudo dentro. Passa por `getRoundDetail` de propósito:
 * a página que já pediu o detalhe daquele id reaproveita o mesmo `cache()` em
 * vez de repetir a consulta.
 */
export const getCurrentRound = cache(async (groupId: string) => {
  const id = await getCurrentRoundId(groupId);
  return id ? getRoundDetail(id) : null;
});

/**
 * Tem jogo rolando? É tudo que a casca precisa saber pra acender o ponto
 * vermelho na navegação — e cabe numa consulta de uma coluna.
 */
export const temRodadaAoVivo = cache(async (groupId: string) => {
  const aoVivo = await prisma.round.findFirst({
    where: { groupId, status: "LIVE" },
    select: { id: true },
  });
  return aoVivo !== null;
});

/**
 * Histórico das rodadas encerradas, já com o craque de cada uma.
 *
 * O MVP era calculado só na página pública (`/r/[token]`) — dívida da Fase 2
 * anotada no HANDOFF. Ele sai daqui pronto porque decidir craque é regra de
 * domínio (`mvpDaRodada`), e página não decide nada.
 */
export const getRoundHistory = cache(async (groupId: string, take = 10) => {
  const rounds = await prisma.round.findMany({
    where: { groupId, status: "FINISHED" },
    orderBy: { date: "desc" },
    take,
    include: {
      teams: {
        orderBy: { order: "asc" },
        include: { players: { select: { playerId: true } } },
      },
      matches: {
        orderBy: { order: "asc" },
        include: {
          events: {
            select: {
              matchId: true,
              type: true,
              teamId: true,
              playerId: true,
              assistPlayerId: true,
              voidedAt: true,
            },
          },
        },
      },
      _count: { select: { attendances: true } },
    },
  });

  const stats = rounds.map((round) => {
    const roster: StatRoster = {};
    for (const team of round.teams) {
      roster[team.id] = team.players.map((tp) => tp.playerId);
    }
    const matches: StatMatch[] = round.matches.map((match) => ({
      id: match.id,
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      scoreA: match.scoreA,
      scoreB: match.scoreB,
      status: match.status,
    }));
    const events: StatEvent[] = round.matches.flatMap((match) => match.events);
    return mvpDaRodada(aggregatePlayerStats(matches, events, roster).values());
  });

  const nomes = await prisma.player.findMany({
    where: {
      id: { in: [...new Set(stats.filter(Boolean).map((mvp) => mvp!.playerId))] },
    },
    select: { id: true, displayName: true, nickname: true },
  });
  const porId = new Map(nomes.map((player) => [player.id, player]));

  return rounds.map((round, index) => {
    const mvp = stats[index];
    const jogador = mvp ? porId.get(mvp.playerId) : undefined;
    return {
      ...round,
      craque: jogador
        ? {
            playerId: mvp!.playerId,
            nome: jogador.nickname ?? jogador.displayName,
            contributions: mvp!.contributions,
          }
        : null,
    };
  });
});

/** Tem rodada com gente pra repetir? É o que decide se o atalho aparece. */
export const temRodadaAnterior = cache(async (groupId: string) => {
  const anterior = await prisma.round.findFirst({
    where: { groupId, attendances: { some: {} } },
    select: { id: true },
  });
  return Boolean(anterior);
});

/** Times da rodada anterior — alimentam o histórico do balanceador. */
export const getPreviousTeams = cache(async (groupId: string, beforeDate: Date) =>
  timesAnteriores(prisma, groupId, beforeDate),
);

export function splitAttendances<T extends { status: string; asGoalkeeper: boolean }>(
  attendances: T[],
) {
  return {
    confirmed: attendances.filter((a) => a.status === "CONFIRMED"),
    goalkeepers: attendances.filter((a) => a.status === "CONFIRMED" && a.asGoalkeeper),
    waiting: attendances.filter((a) => a.status === "WAITING"),
  };
}

export function liveMatch<T extends { status: string }>(matches: T[]): T | undefined {
  return matches.find((match) => match.status === "LIVE");
}
