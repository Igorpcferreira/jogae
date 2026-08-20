import "server-only";

import { cache } from "react";
import { prisma } from "@/db/client";
import { janelaDaVotacao } from "@/domain/mvp/votacao";
import { apitoFinalDe, situacaoDaVotacao } from "./service";

/**
 * A rodada que está em votação agora, se houver.
 *
 * Consulta separada da "rodada atual" de propósito. `getCurrentRoundId` devolve
 * a que a interface mostra — a que está ao vivo, senão a próxima marcada — e
 * assim que o organizador cria a rodada da semana seguinte (ou usa "repetir
 * rodada", que é o caminho normal), a rodada recém-encerrada deixa de ser a
 * atual. A votação some da tela no dia seguinte ao jogo, que é justamente
 * quando ela mais acontece.
 */
export const getRodadaEmVotacao = cache(async (groupId: string) => {
  const ultima = await prisma.round.findFirst({
    where: { groupId, status: "FINISHED" },
    orderBy: { date: "desc" },
    select: { id: true, date: true, finishedAt: true, status: true },
  });
  if (!ultima) return null;

  const janela = janelaDaVotacao(ultima.status, apitoFinalDe(ultima), new Date());
  return janela.aberta ? { roundId: ultima.id, fechaEm: janela.fechaEm } : null;
});

export interface PainelDeVotacao {
  roundId: string;
  fechaEm: Date | null;
  jaVotou: boolean;
  podeVotar: boolean;
  /** Por que não pode, quando não pode. */
  motivo: string | null;
  candidatos: Array<{ id: string; nome: string }>;
}

const RECADO: Record<string, string> = {
  "rodada-nao-acabou": "A votação abre quando a rodada terminar.",
  "votacao-fechada": "A votação dessa rodada já fechou.",
  "nao-jogou": "Só quem jogou a rodada vota.",
  "ja-votou": "Seu voto já está contado. Obrigado!",
};

/**
 * O que a tela do jogador precisa pra votar.
 *
 * Os candidatos saem com nome e id, e **nada mais** — nem posição, nem gols,
 * nem nível técnico (plano §13). Mostrar estatística ao lado do nome seria o
 * app sugerindo em quem votar, e aí a votação vira o cálculo com passos extras.
 */
export const getPainelDeVotacao = cache(
  async (roundId: string, playerId: string): Promise<PainelDeVotacao | null> => {
    const situacao = await situacaoDaVotacao(prisma, roundId, playerId);
    if (!situacao) return null;

    const jogadores = await prisma.player.findMany({
      where: { id: { in: situacao.candidatos } },
      select: { id: true, displayName: true, nickname: true },
    });

    return {
      roundId: situacao.roundId,
      fechaEm: situacao.fechaEm,
      jaVotou: situacao.jaVotou,
      podeVotar: situacao.permissao.ok,
      motivo: situacao.permissao.ok ? null : RECADO[situacao.permissao.motivo] ?? null,
      candidatos: jogadores
        .map((jogador) => ({
          id: jogador.id,
          nome: jogador.nickname ?? jogador.displayName,
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    };
  },
);

export interface EscolhaDaGalera {
  vencedores: Array<{ id: string; nome: string }>;
  votos: number;
  totalDeVotos: number;
}

/**
 * O resultado da votação de uma rodada — só depois de a urna fechar.
 *
 * Com a votação aberta devolve `null` em vez do parcial: mostrar quem está
 * ganhando no meio da votação transforma o prêmio em campanha, e o voto de
 * quem ainda não votou passa a ser sobre o placar em vez de sobre o jogo.
 */
export const getEscolhaDaGalera = cache(
  async (roundId: string): Promise<EscolhaDaGalera | null> => {
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      select: {
        id: true,
        status: true,
        date: true,
        finishedAt: true,
        attendances: { where: { status: "CONFIRMED" }, select: { playerId: true } },
        votos: { select: { voterPlayerId: true, votedPlayerId: true } },
      },
    });
    if (!round) return null;

    const janela = janelaDaVotacao(round.status, apitoFinalDe(round), new Date());
    if (janela.aberta) return null;

    const situacao = await situacaoDaVotacao(prisma, roundId, "");
    if (!situacao || situacao.apuracao.vencedores.length === 0) return null;

    const jogadores = await prisma.player.findMany({
      where: { id: { in: situacao.apuracao.vencedores } },
      select: { id: true, displayName: true, nickname: true },
    });

    return {
      vencedores: jogadores.map((jogador) => ({
        id: jogador.id,
        nome: jogador.nickname ?? jogador.displayName,
      })),
      votos: situacao.apuracao.votosDoVencedor,
      totalDeVotos: situacao.apuracao.totalDeVotos,
    };
  },
);
