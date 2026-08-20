import "server-only";

import { cache } from "react";
import { prisma } from "@/db/client";
import { opcoesDeEscolha } from "@/domain/roster/escolha-de-jogador";
import {
  getGrupoPorLinkDeConvidado,
  getJogadorPorLinkPessoal,
} from "@/features/auth/queries";
import { getCurrentRoundId } from "@/features/rounds/queries";

/**
 * O que a tela do link de convidado (`/e/<token>`) precisa saber.
 *
 * Consulta própria, escolhendo campo a campo, pela mesma razão do link pessoal:
 * esta rota é aberta por 22 pessoas sem sessão nenhuma, e `skillLevel` não pode
 * chegar perto dela (plano §13). O que sai daqui é nome, data e contagem.
 */
export const getEntradaDoGrupo = cache(async (publicToken: string) => {
  const grupo = await getGrupoPorLinkDeConvidado(publicToken);
  if (!grupo) return null;

  const [jogadores, roundId] = await Promise.all([
    prisma.player.findMany({
      where: { groupId: grupo.id },
      select: { id: true, displayName: true, nickname: true, active: true },
    }),
    getCurrentRoundId(grupo.id),
  ]);

  const rodada = roundId
    ? await prisma.round.findUnique({
        where: { id: roundId },
        select: {
          date: true,
          startsAt: true,
          venue: true,
          status: true,
          _count: { select: { attendances: { where: { status: "CONFIRMED" } } } },
        },
      })
    : null;

  return {
    grupo,
    // A regra de "quem aparece e como se chama" é do domínio, não da página.
    opcoes: opcoesDeEscolha(jogadores),
    rodada: rodada
      ? {
          date: rodada.date,
          startsAt: rodada.startsAt,
          venue: rodada.venue,
          status: rodada.status,
          confirmados: rodada._count.attendances,
        }
      : null,
  };
});

export type EntradaDoGrupo = NonNullable<Awaited<ReturnType<typeof getEntradaDoGrupo>>>;

/**
 * O jogador que este aparelho já disse ser — se o cookie ainda valer.
 *
 * Vale só se o token abrir um jogador **ativo deste grupo**. Cookie velho de
 * quem saiu do elenco, ou de outro grupo, é como se não existisse: a pessoa
 * escolhe o nome de novo em vez de tomar um 404 sem explicação.
 */
export async function jogadorLembradoValido(
  groupId: string,
  selfToken: string | null,
): Promise<string | null> {
  if (!selfToken) return null;

  const jogador = await getJogadorPorLinkPessoal(selfToken);
  if (!jogador || jogador.groupId !== groupId) return null;

  return selfToken;
}
