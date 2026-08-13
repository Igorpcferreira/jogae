import "server-only";
import { cache } from "react";
import { prisma } from "@/db/client";
import {
  aggregatePlayerStats,
  buildRanking,
  type RankingMetric,
  type RankingRow,
  type StatEvent,
  type StatMatch,
  type StatRoster,
} from "@/domain/statistics/aggregate";
import { startOfMonth } from "@/lib/dates";

export type RankingPeriod = "round" | "month" | "all";

export interface RankingEntry extends RankingRow {
  displayName: string;
  nickname: string | null;
}

/**
 * Ranking agregado no servidor. Todos os filtros de período viram um recorte
 * de rodadas; a agregação em si é do domínio, não do banco.
 */
export const getRanking = cache(
  async (
    groupId: string,
    period: RankingPeriod,
    metric: RankingMetric,
    roundId?: string,
  ): Promise<RankingEntry[]> => {
    const dateFilter =
      period === "month" ? { gte: startOfMonth() } : undefined;

    const rounds = await prisma.round.findMany({
      where: {
        groupId,
        ...(period === "round" && roundId ? { id: roundId } : {}),
        ...(dateFilter ? { date: dateFilter } : {}),
      },
      include: {
        attendances: { where: { status: "CONFIRMED" }, select: { playerId: true } },
        teams: { include: { players: { select: { playerId: true } } } },
        matches: {
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
      },
    });

    const matches: StatMatch[] = [];
    const events: StatEvent[] = [];
    const roster: StatRoster = {};
    const presence: Record<string, number> = {};

    for (const round of rounds) {
      for (const attendance of round.attendances) {
        presence[attendance.playerId] = (presence[attendance.playerId] ?? 0) + 1;
      }
      for (const team of round.teams) {
        roster[team.id] = team.players.map((tp) => tp.playerId);
      }
      for (const match of round.matches) {
        matches.push({
          id: match.id,
          teamAId: match.teamAId,
          teamBId: match.teamBId,
          scoreA: match.scoreA,
          scoreB: match.scoreB,
          status: match.status,
        });
        events.push(...match.events);
      }
    }

    const stats = aggregatePlayerStats(matches, events, roster);

    // Jogador com presença mas sem time (rodada sem sorteio) também entra.
    for (const playerId of Object.keys(presence)) {
      if (!stats.has(playerId)) {
        stats.set(playerId, {
          playerId,
          goals: 0,
          assists: 0,
          contributions: 0,
          matchesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          winRate: 0,
        });
      }
    }

    const ranking = buildRanking(stats.values(), metric, presence);

    const players = await prisma.player.findMany({
      where: { id: { in: ranking.map((row) => row.playerId) } },
      select: { id: true, displayName: true, nickname: true },
    });
    const byId = new Map(players.map((player) => [player.id, player]));

    return ranking
      .filter((row) => byId.has(row.playerId))
      .map((row) => ({
        ...row,
        displayName: byId.get(row.playerId)!.displayName,
        nickname: byId.get(row.playerId)!.nickname,
      }));
  },
);

/** Top artilheiros do mês — usado no card da home. */
export const getTopScorersOfMonth = cache(async (groupId: string, take = 3) => {
  const ranking = await getRanking(groupId, "month", "goals");
  return ranking.filter((row) => row.goals > 0).slice(0, take);
});
