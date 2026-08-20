import "server-only";

import { cache } from "react";
import { prisma } from "@/db/client";
import { FUSO_PADRAO } from "@/domain/time/fuso";
import { conquistasPorJogador } from "@/domain/badges/conquistas";
import { parceriasMaisFrequentes, estatisticaDaDupla } from "@/domain/statistics/dupla";
import { resumoDoJogador } from "@/domain/statistics/perfil";
import { melhorMesDoJogador, recordesDoJogador } from "@/domain/statistics/recordes";
import { getNomesDoGrupo } from "@/features/groups/queries";
import { getHistorico } from "@/features/rankings/historico";
import { getConquistas } from "@/features/rankings/queries";

/**
 * O card do jogador (plano §27).
 *
 * Uma consulta pesada por definição — ela lê o histórico inteiro do grupo pra
 * calcular recorde e parceria —, e é por isso que ela é `cache()` e mora numa
 * tela própria, em vez de aparecer dentro de uma lista. Um grupo semanal de
 * dois anos são ~100 rodadas; o `getHistorico` já é compartilhado com as
 * conquistas, então na mesma renderização isso é uma ida ao banco, não duas.
 *
 * **`skillLevel` não é selecionado em lugar nenhum deste arquivo** (plano §13).
 * O card é a tela que vira print no grupo do WhatsApp.
 */
export const getCardDoJogador = cache(
  async (groupId: string, playerId: string, fuso: string = FUSO_PADRAO) => {
    const jogador = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        groupId: true,
        displayName: true,
        nickname: true,
        isGoalkeeper: true,
        preferredRole: true,
        active: true,
      },
    });
    // Jogador de outro grupo responde como jogador inexistente: o id vem da URL.
    if (!jogador || jogador.groupId !== groupId) return null;

    const [historico, nomes, conquistasDoGrupo] = await Promise.all([
      getHistorico(groupId),
      getNomesDoGrupo(groupId),
      getConquistas(groupId),
    ]);

    const parcerias = parceriasMaisFrequentes(historico, playerId, 3).map((parceria) => ({
      ...parceria,
      nome: nomes.get(parceria.parceiroId) ?? "Jogador",
    }));

    return {
      jogador: {
        id: jogador.id,
        nome: jogador.nickname ?? jogador.displayName,
        nomeCompleto: jogador.displayName,
        isGoalkeeper: jogador.isGoalkeeper,
        preferredRole: jogador.preferredRole,
        active: jogador.active,
      },
      resumo: resumoDoJogador(historico, playerId),
      recordes: recordesDoJogador(historico, playerId),
      melhorMes: melhorMesDoJogador(historico, playerId, fuso),
      parcerias,
      // As conquistas do mês que são dele. O card mostra o que está valendo
      // agora; o histórico de conquistas antigas viraria uma lista sem fim.
      conquistas: (conquistasPorJogador(conquistasDoGrupo).get(playerId) ?? []).map(
        (conquista) => ({ tipo: conquista.tipo, valor: conquista.valor }),
      ),
    };
  },
);

export type CardDoJogador = NonNullable<Awaited<ReturnType<typeof getCardDoJogador>>>;

/**
 * A dupla de dois jogadores do grupo — a "comparação entre amigos" do §27,
 * resolvida como parceria (ver `domain/statistics/dupla.ts`).
 */
export const getDupla = cache(async (groupId: string, aId: string, bId: string) => {
  const jogadores = await prisma.player.findMany({
    where: { groupId, id: { in: [aId, bId] } },
    select: { id: true, displayName: true, nickname: true },
  });
  // Os dois têm que ser deste grupo — os ids vêm da URL.
  if (jogadores.length !== 2 || aId === bId) return null;

  const historico = await getHistorico(groupId);
  const nome = (id: string) => {
    const jogador = jogadores.find((j) => j.id === id);
    return jogador ? (jogador.nickname ?? jogador.displayName) : "Jogador";
  };

  return {
    a: { id: aId, nome: nome(aId) },
    b: { id: bId, nome: nome(bId) },
    estatistica: estatisticaDaDupla(historico, aId, bId),
  };
});
