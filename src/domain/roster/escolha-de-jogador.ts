// Quem aparece na lista do link de convidado do grupo (`/e/<token>`) — e,
// principalmente, **o que essa lista pode mostrar**.
//
// A invariante do plano §13 vira tipo aqui: a escolha devolve `id` e `nome`, e
// nada mais. Nível técnico, posição preferida e "é goleiro" não saem desta
// função porque o link do grupo circula no WhatsApp e é aberto por 22 pessoas.
// Se um dia a tela precisar de outro campo, que seja decisão de produto — não
// conveniência de quem estiver escrevendo a página.
//
// A segunda regra é desambiguar: tocar no nome errado significa responder a
// presença de outra pessoa. Dois "Rafa" na lista não podem existir.

import { normalizeName } from "@/domain/text/normalize";

export interface JogadorParaEscolha {
  id: string;
  displayName: string;
  nickname: string | null;
  active: boolean;
}

export interface OpcaoDeEscolha {
  id: string;
  /** Como o grupo chama a pessoa — já desambiguado. */
  nome: string;
}

/**
 * A lista de nomes do link de convidado, em ordem alfabética e sem repetição
 * visível.
 *
 * Jogador inativo fica de fora: ele perdeu a vaga no elenco, e mostrar o nome
 * dele convidaria alguém a responder no lugar de quem não joga mais.
 *
 * O apelido ganha do nome de batismo (é como o grupo chama), **exceto** quando
 * ele deixaria duas pessoas com o mesmo rótulo — aí as duas voltam pro nome
 * completo. Nome completo repetido é problema do elenco, não desta função:
 * `domain/roster` já recusa cadastro em conflito.
 */
export function opcoesDeEscolha(
  jogadores: readonly JogadorParaEscolha[],
): OpcaoDeEscolha[] {
  const ativos = jogadores.filter((jogador) => jogador.active);

  const vezes = new Map<string, number>();
  for (const jogador of ativos) {
    const chave = normalizeName(jogador.nickname ?? jogador.displayName);
    vezes.set(chave, (vezes.get(chave) ?? 0) + 1);
  }

  return ativos
    .map((jogador) => {
      const preferido = jogador.nickname ?? jogador.displayName;
      const ambiguo = (vezes.get(normalizeName(preferido)) ?? 0) > 1;
      return { id: jogador.id, nome: ambiguo ? jogador.displayName : preferido };
    })
    .sort((a, b) => {
      // Ordem sem acento: "Ávila" fica antes de "Bruno", como qualquer um espera.
      const porNome = normalizeName(a.nome).localeCompare(normalizeName(b.nome), "pt-BR");
      // Desempate pelo id mantém a ordem estável entre renderizações.
      return porNome !== 0 ? porNome : a.id.localeCompare(b.id);
    });
}
