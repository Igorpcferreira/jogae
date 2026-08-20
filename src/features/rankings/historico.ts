import "server-only";

import { cache } from "react";
import { prisma } from "@/db/client";
import {
  aggregatePlayerStats,
  mvpDaRodada,
  type StatEvent,
  type StatMatch,
  type StatRoster,
} from "@/domain/statistics/aggregate";
import { apurarVotacao } from "@/domain/mvp/votacao";
import type { RodadaCompleta } from "@/domain/statistics/historico";

/**
 * O histórico do grupo numa forma só (`RodadaCompleta`).
 *
 * Existe porque cinco coisas da Fase 2 — conquistas, recordes, melhor mês,
 * retrospectiva e dupla — fazem a mesma pergunta ao banco. Cada uma com sua
 * consulta é como duas telas passam a mostrar números diferentes pro mesmo
 * jogador, e o bug só aparece quando alguém repara.
 *
 * **Só rodada `FINISHED` entra.** Rodada marcada que ainda não rolou não pode
 * contar presença (a sequência mediria intenção) nem gol (o placar ainda muda).
 *
 * Nível técnico não é selecionado em lugar nenhum daqui (plano §13): parte
 * disto alimenta o link pessoal, que é rota pública.
 */
export const getHistorico = cache(
  async (
    groupId: string,
    recorte: { de?: Date; ate?: Date; roundId?: string } = {},
  ): Promise<RodadaCompleta[]> => {
    const rounds = await prisma.round.findMany({
      where: {
        groupId,
        status: "FINISHED",
        ...(recorte.roundId ? { id: recorte.roundId } : {}),
        ...(recorte.de || recorte.ate
          ? {
              date: {
                ...(recorte.de ? { gte: recorte.de } : {}),
                ...(recorte.ate ? { lt: recorte.ate } : {}),
              },
            }
          : {}),
      },
      // Ordem cronológica é contrato: sequência de presença e "melhor mês"
      // dependem dela, e nenhuma das duas tem como perceber que veio torto.
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
        votos: { select: { voterPlayerId: true, votedPlayerId: true } },
      },
    });

    return rounds.map((round) => {
      const gols: Record<string, number> = {};
      const assistencias: Record<string, number> = {};
      const passes: RodadaCompleta["passes"] = [];
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
          // Gol contra não é gol de ninguém — mesma regra do `aggregate`.
          if (evento.type === "GOAL" && evento.playerId) {
            gols[evento.playerId] = (gols[evento.playerId] ?? 0) + 1;
            if (evento.assistPlayerId) {
              passes.push({ de: evento.assistPlayerId, para: evento.playerId });
            }
          }
          if (evento.assistPlayerId) {
            assistencias[evento.assistPlayerId] =
              (assistencias[evento.assistPlayerId] ?? 0) + 1;
          }
        }
      }

      const presentes = round.attendances.map((presenca) => presenca.playerId);
      const mvp = mvpDaRodada(aggregatePlayerStats(matches, events, roster).values());

      // Apuração aqui e não na tela: a lista de votos entra e não sai. O que
      // segue adiante é o vencedor — o voto é secreto por desenho.
      const apuracao = apurarVotacao(
        round.votos.map((voto) => ({
          votanteId: voto.voterPlayerId,
          votadoId: voto.votedPlayerId,
        })),
        presentes.length,
      );

      return {
        roundId: round.id,
        data: round.date,
        presentes,
        gols,
        assistencias,
        passes,
        partidas: round.matches
          .filter((match) => match.status === "FINISHED")
          .map((match) => ({
            matchId: match.id,
            timeA: roster[match.teamAId] ?? [],
            timeB: roster[match.teamBId] ?? [],
            golsA: match.scoreA,
            golsB: match.scoreB,
          })),
        mvpPlayerId: mvp?.playerId ?? null,
        escolhaDaGaleraIds: apuracao.vencedores,
        votosDaEscolha: apuracao.votosDoVencedor,
      };
    });
  },
);

/**
 * Quem jogou a primeira rodada da vida no recorte pedido.
 *
 * Pergunta que atravessa o período: quem apareceu em janeiro não é estreante em
 * março, e isso não dá pra responder com as rodadas que já estão carregadas.
 */
export const getEstreantes = cache(
  async (groupId: string, rodadas: RodadaCompleta[]): Promise<string[]> => {
    if (rodadas.length === 0) return [];

    const primeira = rodadas[0];
    const candidatos = [...new Set(rodadas.flatMap((rodada) => rodada.presentes))];
    if (candidatos.length === 0) return [];

    const veteranos = await prisma.attendance.findMany({
      where: {
        playerId: { in: candidatos },
        status: "CONFIRMED",
        round: { groupId, status: "FINISHED", date: { lt: primeira.data } },
      },
      select: { playerId: true },
      distinct: ["playerId"],
    });

    const jaJogou = new Set(veteranos.map((linha) => linha.playerId));
    return candidatos.filter((playerId) => !jaJogou.has(playerId));
  },
);
