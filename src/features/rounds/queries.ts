import "server-only";
import { cache } from "react";
import { prisma } from "@/db/client";
import type { Prisma } from "@/db/generated/client";
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

export const getRoundHistory = cache(async (groupId: string, take = 10) => {
  return prisma.round.findMany({
    where: { groupId, status: "FINISHED" },
    orderBy: { date: "desc" },
    take,
    include: {
      teams: { orderBy: { order: "asc" } },
      matches: { orderBy: { order: "asc" } },
      _count: { select: { attendances: true } },
    },
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
