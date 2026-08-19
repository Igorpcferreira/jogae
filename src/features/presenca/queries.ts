import "server-only";

import { cache } from "react";
import { prisma } from "@/db/client";
import { filaDaEspera, posicaoNaEspera } from "@/domain/attendance/presenca";
import { getJogadorPorLinkPessoal } from "@/features/auth/queries";
import { getCurrentRoundId } from "@/features/rounds/queries";

/**
 * O que a tela do link pessoal (`/p/<token>`) precisa saber — e só isso.
 *
 * Consulta própria em vez de reaproveitar `getCurrentRound`: aquela traz a
 * rodada inteira, com o `Player` completo dentro, e `skillLevel` não pode
 * chegar nem perto de uma rota pública (plano §13). Aqui cada campo é
 * escolhido a dedo, o que também deixa a página leve — ela é aberta do 4G do
 * estacionamento, uma vez por semana.
 */
export const getPainelDoJogador = cache(async (selfToken: string) => {
  const jogador = await getJogadorPorLinkPessoal(selfToken);
  if (!jogador) return null;

  const roundId = await getCurrentRoundId(jogador.group.id);
  if (!roundId) return { jogador, rodada: null };

  const rodada = await prisma.round.findUnique({
    where: { id: roundId },
    select: {
      id: true,
      date: true,
      startsAt: true,
      venue: true,
      venueUrl: true,
      status: true,
      drawnAt: true,
      publicToken: true,
      teamCount: true,
      fieldPlayersPerTeam: true,
      attendances: {
        select: {
          playerId: true,
          status: true,
          order: true,
          asGoalkeeper: true,
          player: { select: { isGoalkeeper: true } },
        },
        orderBy: { order: "asc" },
      },
      teams: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          color: true,
          players: {
            select: {
              isGoalkeeper: true,
              player: { select: { id: true, displayName: true, nickname: true } },
            },
          },
        },
      },
    },
  });
  if (!rodada) return { jogador, rodada: null };

  const presencas = rodada.attendances.map((presenca) => ({
    playerId: presenca.playerId,
    status: presenca.status,
    order: presenca.order,
    asGoalkeeper: presenca.asGoalkeeper,
    goleiroNoElenco: presenca.player.isGoalkeeper,
  }));

  const minha = presencas.find((presenca) => presenca.playerId === jogador.id) ?? null;
  const capacidade =
    rodada.teamCount * (rodada.fieldPlayersPerTeam + jogador.group.goalkeepersPerTeam);

  const meuTime =
    rodada.teams.find((time) =>
      time.players.some((tp) => tp.player.id === jogador.id),
    ) ?? null;

  return {
    jogador,
    rodada: {
      id: rodada.id,
      date: rodada.date,
      startsAt: rodada.startsAt,
      venue: rodada.venue,
      venueUrl: rodada.venueUrl,
      status: rodada.status,
      sorteada: rodada.drawnAt !== null,
      publicToken: rodada.publicToken,
      capacidade,
      confirmados: presencas.filter((p) => p.status === "CONFIRMED").length,
      naEspera: filaDaEspera(presencas).length,
      minhaPresenca: minha?.status ?? null,
      minhaPosicaoNaEspera: posicaoNaEspera(presencas, jogador.id),
      meuTime: meuTime
        ? {
            name: meuTime.name,
            color: meuTime.color,
            // Ordem estável: goleiro primeiro, como no card de time.
            jogadores: [...meuTime.players]
              .sort((a, b) => Number(b.isGoalkeeper) - Number(a.isGoalkeeper))
              .map((tp) => ({
                id: tp.player.id,
                nome: tp.player.nickname ?? tp.player.displayName,
                isGoalkeeper: tp.isGoalkeeper,
              })),
          }
        : null,
    },
  };
});

export type PainelDoJogador = NonNullable<Awaited<ReturnType<typeof getPainelDoJogador>>>;
