import "server-only";
import { cache } from "react";
import { prisma } from "@/db/client";
import { capacidadeDoFormato } from "@/domain/groups/setup";

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
