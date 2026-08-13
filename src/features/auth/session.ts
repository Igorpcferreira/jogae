import "server-only";

import { cache } from "react";
import { prisma } from "@/db/client";
import { criarClientDoServidor } from "@/lib/supabase/server";

/**
 * A ponte entre a identidade (Supabase) e o usuário do domínio (Prisma).
 *
 * O Supabase é dono de "quem é você"; o `User` daqui é dono de "o que você é
 * neste app" — nome exibido, grupos, papéis. Manter os dois separados é o que
 * permite trocar de provedor de auth sem reescrever `Membership` e sem que os
 * ids do domínio mudem debaixo do banco inteiro.
 */

export interface Identidade {
  /** `sub` do JWT — o id do usuário no Supabase. */
  authId: string;
  email: string;
  nome: string | null;
  avatarUrl: string | null;
}

/**
 * Identidade verificada da requisição, ou `null` pra visitante.
 *
 * `getClaims()` valida a assinatura do JWT. **Nunca** use `getSession()` aqui:
 * ele lê o cookie sem verificar e o cookie é entrada do usuário.
 */
export const lerIdentidade = cache(async (): Promise<Identidade | null> => {
  const supabase = await criarClientDoServidor();
  const { data, error } = await supabase.auth.getClaims();

  const claims = data?.claims;
  if (error || !claims?.sub || !claims.email) return null;

  const metadados = claims.user_metadata ?? {};
  return {
    authId: claims.sub,
    email: String(claims.email).toLowerCase(),
    nome:
      (typeof metadados.full_name === "string" && metadados.full_name) ||
      (typeof metadados.name === "string" && metadados.name) ||
      null,
    avatarUrl:
      typeof metadados.avatar_url === "string" ? metadados.avatar_url : null,
  };
});

/** "pedro.lima" → "Pedro Lima". Só usado quando o provedor não mandou nome. */
export function nomeAPartirDoEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return (
    local
      .split(/[._-]+/)
      .filter(Boolean)
      .map((parte) => parte[0].toUpperCase() + parte.slice(1))
      .join(" ") || "Organizador"
  );
}

/**
 * Garante o `User` do domínio pra uma identidade que acabou de entrar.
 *
 * Casa por `email`, não por `authId`: quem foi convidado ou veio do seed já
 * existe aqui sem nunca ter logado, e criar um segundo registro deixaria a
 * pessoa sem os grupos dela. O `authId` é gravado neste primeiro encontro.
 */
export async function garantirUsuario(identidade: Identidade) {
  return prisma.user.upsert({
    where: { email: identidade.email },
    create: {
      email: identidade.email,
      authId: identidade.authId,
      name: identidade.nome ?? nomeAPartirDoEmail(identidade.email),
      avatarUrl: identidade.avatarUrl,
    },
    update: {
      authId: identidade.authId,
      // O nome só é sobrescrito se o cadastro ainda não tem um de verdade —
      // quem editou o próprio nome no app não quer o do Google de volta.
      avatarUrl: identidade.avatarUrl ?? undefined,
    },
    select: { id: true, email: true },
  });
}
