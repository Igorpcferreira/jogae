import "server-only";
import { cache } from "react";
import { prisma } from "@/db/client";
import {
  aggregatePlayerStats,
  buildRanking,
  mvpDaRodada,
  type RankingMetric,
  type RankingRow,
  type StatEvent,
  type StatMatch,
  type StatRoster,
} from "@/domain/statistics/aggregate";
import {
  conquistasDaRodada,
  conquistasDoPeriodo,
  type Conquista,
  type RodadaDoHistorico,
} from "@/domain/badges/conquistas";
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

/* ── Conquistas (Fase 2 — plano §27) ───────────────────────── */

export interface ConquistaComNome extends Conquista {
  displayName: string;
  nickname: string | null;
}

/**
 * Conquistas do grupo: as do mês (artilheiro, garçom, presença de ferro) mais
 * as da última rodada que aconteceu (craque, hat-trick, estreia).
 *
 * O recorte é **sempre o mês**, e não o período que a aba do ranking estiver
 * mostrando, porque o rótulo diz "do mês" — ranking geral com conquista
 * mensal é confuso; conquista mensal com nome de mensal, não.
 *
 * Só rodada `FINISHED` entra. Rodada marcada que ainda não rolou não pode
 * contar presença — a sequência de ferro mediria intenção, não presença.
 */
export const getConquistas = cache(
  async (groupId: string): Promise<ConquistaComNome[]> => {
    const rounds = await prisma.round.findMany({
      where: { groupId, status: "FINISHED", date: { gte: startOfMonth() } },
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        attendances: {
          where: { status: "CONFIRMED" },
          select: { playerId: true },
        },
        teams: { select: { id: true, players: { select: { playerId: true } } } },
        matches: {
          select: {
            id: true,
            teamAId: true,
            teamBId: true,
            scoreA: true,
            scoreB: true,
            status: true,
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
    if (rounds.length === 0) return [];

    const historico: RodadaDoHistorico[] = rounds.map((round) => {
      const gols: Record<string, number> = {};
      const assistencias: Record<string, number> = {};
      const matches: StatMatch[] = [];
      const events: StatEvent[] = [];
      const roster: StatRoster = {};

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
        for (const evento of match.events) {
          events.push(evento);
          if (evento.voidedAt) continue;
          // Gol contra não é gol de ninguém — a mesma regra do `aggregate`.
          if (evento.type === "GOAL" && evento.playerId) {
            gols[evento.playerId] = (gols[evento.playerId] ?? 0) + 1;
          }
          if (evento.assistPlayerId) {
            assistencias[evento.assistPlayerId] =
              (assistencias[evento.assistPlayerId] ?? 0) + 1;
          }
        }
      }

      const mvp = mvpDaRodada(aggregatePlayerStats(matches, events, roster).values());

      return {
        roundId: round.id,
        presentes: round.attendances.map((presenca) => presenca.playerId),
        gols,
        assistencias,
        mvpPlayerId: mvp?.playerId ?? null,
      };
    });

    const ultima = rounds[rounds.length - 1];
    const presentesDaUltima = historico[historico.length - 1].presentes;

    // Estreante é quem nunca tinha jogado uma rodada encerrada antes desta.
    // A pergunta atravessa o mês, então não dá pra responder com o que já
    // está carregado.
    const veteranos = await prisma.attendance.findMany({
      where: {
        playerId: { in: presentesDaUltima },
        status: "CONFIRMED",
        round: { groupId, status: "FINISHED", date: { lt: ultima.date } },
      },
      select: { playerId: true },
      distinct: ["playerId"],
    });
    const jaJogou = new Set(veteranos.map((linha) => linha.playerId));
    const estreantes = presentesDaUltima.filter((playerId) => !jaJogou.has(playerId));

    const conquistas = [
      ...conquistasDoPeriodo(historico),
      ...conquistasDaRodada(historico[historico.length - 1], estreantes),
    ];
    if (conquistas.length === 0) return [];

    const players = await prisma.player.findMany({
      where: { id: { in: [...new Set(conquistas.map((c) => c.playerId))] } },
      select: { id: true, displayName: true, nickname: true },
    });
    const byId = new Map(players.map((player) => [player.id, player]));

    return conquistas
      .filter((conquista) => byId.has(conquista.playerId))
      .map((conquista) => ({
        ...conquista,
        displayName: byId.get(conquista.playerId)!.displayName,
        nickname: byId.get(conquista.playerId)!.nickname,
      }));
  },
);
