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
 * A rodada que a home mostra: a que está ao vivo, senão a próxima aberta,
 * senão a última encerrada.
 */
export const getCurrentRound = cache(async (groupId: string) => {
  const live = await prisma.round.findFirst({
    where: { groupId, status: "LIVE" },
    include: roundInclude,
    orderBy: { date: "desc" },
  });
  if (live) return live;

  const upcoming = await prisma.round.findFirst({
    where: { groupId, status: { in: ["OPEN", "CONFIRMED"] } },
    include: roundInclude,
    orderBy: { date: "asc" },
  });
  if (upcoming) return upcoming;

  return prisma.round.findFirst({
    where: { groupId },
    include: roundInclude,
    orderBy: { date: "desc" },
  });
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
