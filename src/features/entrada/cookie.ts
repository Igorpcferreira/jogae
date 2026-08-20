import "server-only";

import { cookies } from "next/headers";

/**
 * "Quem é você neste aparelho" — a única memória do link de convidado.
 *
 * Sem isso o link do grupo obrigaria a escolher o nome toda semana, e escolher
 * o nome é exatamente o atrito que o link pessoal já tinha resolvido. Com o
 * cookie, o segundo clique cai direto na página da pessoa.
 *
 * O valor guardado é o `selfToken` — a mesma credencial que já viaja na URL do
 * link pessoal, então o cookie não amplia o que estava exposto. `httpOnly`
 * mesmo assim: script de página nenhuma tem o que fazer com ele.
 *
 * O escopo é o site inteiro porque `/p/<token>` também lê: é lá que aparece o
 * "não é você?" pra quem tocou no nome errado, e sem esse cookie a página não
 * tem como saber que o aparelho chegou pelo link do grupo. Quem nunca usou o
 * link de convidado não tem cookie e não vê saída nenhuma — que é o certo, o
 * link pessoal sozinho não dá acesso ao elenco.
 */

const PREFIXO = "jogae_jogador_";

/** Um ano: o link não expira, a memória do aparelho também não deveria. */
const UM_ANO_EM_SEGUNDOS = 60 * 60 * 24 * 365;

/** Um cookie por grupo — quem joga em dois grupos é uma pessoa em cada. */
function nomeDoCookie(groupId: string): string {
  return `${PREFIXO}${groupId}`;
}

export async function lerJogadorLembrado(groupId: string): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(nomeDoCookie(groupId))?.value ?? null;
}

/** Só pode ser chamado de server action — gravar cookie exige a resposta. */
export async function lembrarJogador(groupId: string, selfToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(nomeDoCookie(groupId), selfToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: UM_ANO_EM_SEGUNDOS,
  });
}
