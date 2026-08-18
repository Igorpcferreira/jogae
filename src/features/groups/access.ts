import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";
import { permissionsOf, type Permission, type Role } from "@/domain/access/permissions";
import { getPapelNoGrupo, getUsuarioAtual, requireUsuario } from "@/features/auth/queries";
import { getGrupoPorSlug } from "./queries";

export type GrupoComAcesso = {
  group: NonNullable<Awaited<ReturnType<typeof getGrupoPorSlug>>>;
  role: Role;
  permissoes: readonly Permission[];
  pode: (permission: Permission) => boolean;
};

/**
 * Porta de entrada de toda página de `/g/[slug]`.
 *
 * Grupo inexistente e grupo de outra pessoa dão o mesmo 404 de propósito:
 * responder 403 confirmaria que o grupo existe.
 */
export const requireGrupoPorSlug = cache(
  async (slug: string): Promise<GrupoComAcesso> => {
    // Grupo e identidade não dependem um do outro. Em série, as duas idas ao
    // banco somavam na frente de cada página; o vínculo (`getPapelNoGrupo`)
    // é o único que precisa esperar, porque só ele depende dos dois ids.
    const [group] = await Promise.all([getGrupoPorSlug(slug), getUsuarioAtual()]);
    if (!group) notFound();

    await requireUsuario(`/g/${slug}`);

    const role = await getPapelNoGrupo(group.id);
    if (!role) notFound();

    const permissoes = permissionsOf(role);
    return {
      group,
      role,
      permissoes,
      pode: (permission) => permissoes.includes(permission),
    };
  },
);
