// O resumo que vai no card do jogador (plano §27, "cards de jogador").
//
// É a soma da vida do cara no grupo: quantas vezes veio, quantas jogou, o que
// fez. Tudo derivado do histórico, nada guardado — pelo mesmo motivo dos
// recordes: número gravado sobrevive a um "desfazer lance" e passa a mentir.
//
// O que **não** entra aqui, e é a decisão que importa: nível técnico (plano
// §13). O card é a tela mais compartilhável do app — é a que vai virar print no
// grupo do WhatsApp — e a nota que o organizador dá é privada dele. Um card com
// "nível 2" estampado seria o jeito mais rápido de matar a confiança no app.

import { resultadoPara, type RodadaCompleta } from "./historico";

export interface ResumoDoJogador {
  /** Rodadas em que apareceu. */
  rodadas: number;
  /** Partidas em que entrou em campo. */
  partidas: number;
  gols: number;
  assistencias: number;
  participacoes: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  /** Vitórias / partidas, 0–1. */
  aproveitamento: number;
  /** Gols por rodada, com uma casa. */
  golsPorRodada: number;
  /** Primeira e última rodada dele, pra tela dizer desde quando ele joga. */
  primeiraRodada: Date | null;
  ultimaRodada: Date | null;
  /** Quantas vezes foi craque calculado e escolha da galera. */
  vezesCraque: number;
  vezesEscolhaDaGalera: number;
}

const VAZIO: ResumoDoJogador = {
  rodadas: 0,
  partidas: 0,
  gols: 0,
  assistencias: 0,
  participacoes: 0,
  vitorias: 0,
  empates: 0,
  derrotas: 0,
  aproveitamento: 0,
  golsPorRodada: 0,
  primeiraRodada: null,
  ultimaRodada: null,
  vezesCraque: 0,
  vezesEscolhaDaGalera: 0,
};

/**
 * O card do jogador em números.
 *
 * "Rodadas" conta presença e "partidas" conta jogo: quem confirmou e ficou de
 * fora do sorteio esteve lá, mas não jogou. Separar os dois é o que faz o
 * aproveitamento significar alguma coisa.
 *
 * `rodadas` em ordem cronológica — a primeira e a última saem daí.
 */
export function resumoDoJogador(
  rodadas: readonly RodadaCompleta[],
  playerId: string,
): ResumoDoJogador {
  const resumo: ResumoDoJogador = { ...VAZIO };

  for (const rodada of rodadas) {
    if (!rodada.presentes.includes(playerId)) continue;

    resumo.rodadas += 1;
    resumo.primeiraRodada ??= rodada.data;
    resumo.ultimaRodada = rodada.data;

    resumo.gols += rodada.gols[playerId] ?? 0;
    resumo.assistencias += rodada.assistencias[playerId] ?? 0;
    if (rodada.mvpPlayerId === playerId) resumo.vezesCraque += 1;
    if (rodada.escolhaDaGaleraIds.includes(playerId)) resumo.vezesEscolhaDaGalera += 1;

    for (const partida of rodada.partidas) {
      const resultado = resultadoPara(partida, playerId);
      if (!resultado) continue;
      resumo.partidas += 1;
      if (resultado === "vitoria") resumo.vitorias += 1;
      else if (resultado === "empate") resumo.empates += 1;
      else resumo.derrotas += 1;
    }
  }

  resumo.participacoes = resumo.gols + resumo.assistencias;
  resumo.aproveitamento =
    resumo.partidas > 0 ? resumo.vitorias / resumo.partidas : 0;
  resumo.golsPorRodada =
    resumo.rodadas > 0 ? Math.round((resumo.gols / resumo.rodadas) * 10) / 10 : 0;

  return resumo;
}
