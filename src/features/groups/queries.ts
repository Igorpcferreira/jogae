import "server-only";
import { cache } from "react";
import { prisma } from "@/db/client";
import { capacidadeDoFormato } from "@/domain/groups/setup";
import { getCurrentRoundId } from "@/features/rounds/queries";

export const getGrupoPorSlug = cache(async (slug: string) => {
  return prisma.footballGroup.findUnique({ where: { slug } });
});

export const getJogadoresDoGrupo = cache(async (groupId: string) => {
  return prisma.player.findMany({
    where: { groupId },
    include: { aliases: true },
    orderBy: [{ active: "desc" }, { displayName: "asc" }],
  });
});

/** Capacidade padrão calculada a partir do formato do grupo. */
export function groupCapacity(group: {
  teamCount: number;
  fieldPlayersPerTeam: number;
  goalkeepersPerTeam: number;
}): number {
  return capacidadeDoFormato(group);
}

/**
 * Slugs já em uso — o gerador de slug do onboarding precisa saber quais evitar.
 * Não é listagem de grupos pro usuário: para isso existe `getGruposDoUsuario`,
 * que filtra por vínculo.
 */
export async function slugsExistentes(candidatos: string[]): Promise<Set<string>> {
  if (candidatos.length === 0) return new Set();
  const encontrados = await prisma.footballGroup.findMany({
    where: { slug: { in: candidatos } },
    select: { slug: true },
  });
  return new Set(encontrados.map((grupo) => grupo.slug));
}

/**
 * Data e local da próxima rodada, só o suficiente pra montar o recado do link
 * do grupo. Consulta magra de propósito: `getCurrentRound` traz presenças,
 * times e lances, e aqui a tela só quer duas linhas de texto.
 */
export const getResumoDaProximaRodada = cache(async (groupId: string) => {
  const roundId = await getCurrentRoundId(groupId);
  if (!roundId) return null;

  return prisma.round.findUnique({
    where: { id: roundId },
    select: { date: true, startsAt: true, venue: true },
  });
});

/**
 * `playerId` → como o grupo chama a pessoa. Só id, nome e apelido.
 *
 * Existe porque metade da Fase 2 (recordes, retrospectiva, dupla, votação)
 * trabalha com id e precisa virar nome só na hora de desenhar. Consulta magra
 * de propósito: várias dessas telas são públicas ou saem pelo link pessoal, e
 * `skillLevel` não pode chegar perto delas (plano §13).
 */
export const getNomesDoGrupo = cache(async (groupId: string) => {
  const jogadores = await prisma.player.findMany({
    where: { groupId },
    select: { id: true, displayName: true, nickname: true },
  });

  return new Map(
    jogadores.map((jogador) => [jogador.id, jogador.nickname ?? jogador.displayName]),
  );
});
