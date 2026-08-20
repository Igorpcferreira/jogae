// "Comparação entre amigos" (plano §27) — resolvida como **dupla**, não como
// duelo.
//
// O item do plano é o único do §27 que empurra contra a regra do próprio plano
// ("gamificação leve e positiva, evitar mecânicas que gerem conflito"). Uma
// tela "eu × você" num grupo de fut é uma discussão de segunda-feira esperando
// acontecer, e o dado que ela usaria — quem ganha mais — diz mais sobre sorteio
// do que sobre jogador.
//
// A saída é medir o que os dois fizeram **do mesmo lado**: quantas vezes
// caíram juntos, como foi quando caíram, e quantas vezes um serviu o outro. É
// o mesmo dado, virado pro lado que gera resenha em vez de briga. O confronto
// direto continua existindo (é fato, e é divertido), mas como uma linha entre
// várias — nunca como um placar de quem é melhor.
//
// Puro e sem nível técnico, como todo o resto do domínio.

import {
  jogaramContra,
  jogaramJuntos,
  resultadoPara,
  type RodadaCompleta,
} from "./historico";

export interface EstatisticaDaDupla {
  /** Partidas em que os dois estavam no mesmo time. */
  jogosJuntos: number;
  vitoriasJuntos: number;
  empatesJuntos: number;
  derrotasJuntos: number;
  /** Vitórias / jogos juntos, 0–1. */
  aproveitamentoJuntos: number;
  /** Assistências de A que viraram gol de B, e vice-versa. */
  passesDeAparaB: number;
  passesDeBparaA: number;
  /** Partidas em lados opostos. */
  jogosContra: number;
  vitoriasDeA: number;
  vitoriasDeB: number;
  empatesNoConfronto: number;
}

const VAZIO: EstatisticaDaDupla = {
  jogosJuntos: 0,
  vitoriasJuntos: 0,
  empatesJuntos: 0,
  derrotasJuntos: 0,
  aproveitamentoJuntos: 0,
  passesDeAparaB: 0,
  passesDeBparaA: 0,
  jogosContra: 0,
  vitoriasDeA: 0,
  vitoriasDeB: 0,
  empatesNoConfronto: 0,
};

/**
 * O retrato da dupla.
 *
 * A assistência entra por rodada, não por partida: o evento guarda quem passou
 * e quem fez, mas não dá pra saber em qual das seis peladas da noite foi sem
 * cruzar com o `matchId` — e o par "quem serve quem" é interessante no
 * agregado, não no jogo isolado.
 *
 * Chamar com `a === b` devolve tudo zerado em vez de dizer que a pessoa jogou
 * 40 vezes consigo mesma.
 */
export function estatisticaDaDupla(
  rodadas: readonly RodadaCompleta[],
  a: string,
  b: string,
): EstatisticaDaDupla {
  if (a === b) return { ...VAZIO };

  const total: EstatisticaDaDupla = { ...VAZIO };

  for (const rodada of rodadas) {
    for (const partida of rodada.partidas) {
      if (jogaramJuntos(partida, a, b)) {
        total.jogosJuntos += 1;
        const resultado = resultadoPara(partida, a);
        if (resultado === "vitoria") total.vitoriasJuntos += 1;
        else if (resultado === "empate") total.empatesJuntos += 1;
        else if (resultado === "derrota") total.derrotasJuntos += 1;
        continue;
      }

      if (jogaramContra(partida, a, b)) {
        total.jogosContra += 1;
        const resultado = resultadoPara(partida, a);
        if (resultado === "vitoria") total.vitoriasDeA += 1;
        else if (resultado === "derrota") total.vitoriasDeB += 1;
        else if (resultado === "empate") total.empatesNoConfronto += 1;
      }
    }

    for (const passe of rodada.passes) {
      if (passe.de === a && passe.para === b) total.passesDeAparaB += 1;
      if (passe.de === b && passe.para === a) total.passesDeBparaA += 1;
    }
  }

  total.aproveitamentoJuntos =
    total.jogosJuntos > 0 ? total.vitoriasJuntos / total.jogosJuntos : 0;

  return total;
}

export interface Parceria {
  parceiroId: string;
  jogosJuntos: number;
  vitoriasJuntos: number;
  aproveitamentoJuntos: number;
}

/** Quantas partidas juntos pra a dupla deixar de ser coincidência de sorteio. */
export const MINIMO_DE_JOGOS_JUNTOS = 3;

/**
 * Com quem o jogador mais cai junto, do mais frequente pro menos.
 *
 * Ordena por **frequência**, não por aproveitamento: "vocês jogaram 18 vezes
 * juntos" é um fato sobre companheirismo, enquanto "a dupla com quem você mais
 * ganha" viraria, na prática, uma lista de quem carrega quem. O aproveitamento
 * vai junto como informação, não como critério.
 */
export function parceriasMaisFrequentes(
  rodadas: readonly RodadaCompleta[],
  playerId: string,
  limite = 5,
): Parceria[] {
  const jogos = new Map<string, { jogos: number; vitorias: number }>();

  for (const rodada of rodadas) {
    for (const partida of rodada.partidas) {
      const meuTime = partida.timeA.includes(playerId)
        ? partida.timeA
        : partida.timeB.includes(playerId)
          ? partida.timeB
          : null;
      if (!meuTime) continue;

      const venceu = resultadoPara(partida, playerId) === "vitoria";
      for (const companheiro of meuTime) {
        if (companheiro === playerId) continue;
        const entrada = jogos.get(companheiro) ?? { jogos: 0, vitorias: 0 };
        entrada.jogos += 1;
        if (venceu) entrada.vitorias += 1;
        jogos.set(companheiro, entrada);
      }
    }
  }

  return [...jogos.entries()]
    .filter(([, entrada]) => entrada.jogos >= MINIMO_DE_JOGOS_JUNTOS)
    .map(([parceiroId, entrada]) => ({
      parceiroId,
      jogosJuntos: entrada.jogos,
      vitoriasJuntos: entrada.vitorias,
      aproveitamentoJuntos: entrada.vitorias / entrada.jogos,
    }))
    .sort(
      (x, y) =>
        y.jogosJuntos - x.jogosJuntos ||
        y.vitoriasJuntos - x.vitoriasJuntos ||
        // Ordem estável: a tela mostra sempre na mesma sequência.
        x.parceiroId.localeCompare(y.parceiroId),
    )
    .slice(0, limite);
}

export interface DuplaDoPeriodo {
  a: string;
  b: string;
  jogosJuntos: number;
  vitoriasJuntos: number;
}

/**
 * A dupla que mais jogou junta no período — a "dupla do mês" da retrospectiva.
 *
 * Também por frequência, e pelo mesmo motivo: é uma homenagem a quem sempre cai
 * do mesmo lado, não um prêmio de melhor par.
 *
 * Devolve `null` quando ninguém alcançou o mínimo: num mês de duas rodadas
 * qualquer par que caiu junto duas vezes seria "a dupla", e isso é sorteio.
 */
export function duplaDoPeriodo(
  rodadas: readonly RodadaCompleta[],
): DuplaDoPeriodo | null {
  const juntos = new Map<string, { jogos: number; vitorias: number }>();

  for (const rodada of rodadas) {
    for (const partida of rodada.partidas) {
      for (const time of [partida.timeA, partida.timeB]) {
        // Par ordenado pelo id: (a,b) e (b,a) são a mesma dupla.
        const ordenado = [...time].sort((x, y) => x.localeCompare(y));
        for (let i = 0; i < ordenado.length; i++) {
          for (let j = i + 1; j < ordenado.length; j++) {
            const chave = `${ordenado[i]}|${ordenado[j]}`;
            const entrada = juntos.get(chave) ?? { jogos: 0, vitorias: 0 };
            entrada.jogos += 1;
            if (resultadoPara(partida, ordenado[i]) === "vitoria") entrada.vitorias += 1;
            juntos.set(chave, entrada);
          }
        }
      }
    }
  }

  let melhor: DuplaDoPeriodo | null = null;
  for (const [chave, entrada] of juntos) {
    if (entrada.jogos < MINIMO_DE_JOGOS_JUNTOS) continue;
    const [a, b] = chave.split("|");
    const ganha =
      !melhor ||
      entrada.jogos > melhor.jogosJuntos ||
      (entrada.jogos === melhor.jogosJuntos && entrada.vitorias > melhor.vitoriasJuntos) ||
      // Desempate final pelo id, pra não depender da ordem do `Map`.
      (entrada.jogos === melhor.jogosJuntos &&
        entrada.vitorias === melhor.vitoriasJuntos &&
        a.localeCompare(melhor.a) < 0);
    if (ganha) {
      melhor = { a, b, jogosJuntos: entrada.jogos, vitoriasJuntos: entrada.vitorias };
    }
  }

  return melhor;
}
