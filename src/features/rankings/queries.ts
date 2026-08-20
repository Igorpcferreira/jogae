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
import {
  conquistasDaRodada,
  conquistasDoPeriodo,
  type Conquista,
} from "@/domain/badges/conquistas";
import { startOfMonth } from "@/lib/dates";
import { getEstreantes, getHistorico } from "./historico";

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
 * Só rodada `FINISHED` entra, e quem garante isso é `getHistorico`: rodada
 * marcada que ainda não rolou não pode contar presença — a sequência de ferro
 * mediria intenção, não presença.
 */
export const getConquistas = cache(
  async (groupId: string): Promise<ConquistaComNome[]> => {
    const historico = await getHistorico(groupId, { de: startOfMonth() });
    if (historico.length === 0) return [];

    const ultima = historico[historico.length - 1];
    const estreantes = await getEstreantes(groupId, [ultima]);

    const conquistas = [
      ...conquistasDoPeriodo(historico),
      ...conquistasDaRodada(ultima, estreantes),
    ];
    if (conquistas.length === 0) return [];

    return comNome(conquistas);
  },
);

/**
 * As conquistas de **uma rodada só** — craque, escolha da galera, hat-trick e
 * estreia.
 *
 * Serve o share card PNG (`/r/<token>/conquistas/imagem`), que é dado público:
 * é exatamente o que a página pública da rodada já mostra. As conquistas do mês
 * (artilheiro, garçom, presença de ferro) ficam de fora de propósito — elas não
 * são daquela rodada, e um card que mistura as duas coisas mente na data.
 */
export const getConquistasDaRodadaPublica = cache(
  async (roundId: string): Promise<ConquistaComNome[]> => {
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      select: { groupId: true },
    });
    if (!round) return [];

    const historico = await getHistorico(round.groupId, { roundId });
    if (historico.length === 0) return [];

    const estreantes = await getEstreantes(round.groupId, historico);
    const conquistas = conquistasDaRodada(historico[0], estreantes);
    if (conquistas.length === 0) return [];

    return comNome(conquistas);
  },
);

/** Cola nome e apelido nas conquistas — a tela nunca busca jogador sozinha. */
async function comNome(conquistas: Conquista[]): Promise<ConquistaComNome[]> {
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
}
