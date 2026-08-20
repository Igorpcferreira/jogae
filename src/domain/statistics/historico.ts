// A forma do histórico do grupo, do jeito que a Fase 2 precisa ler.
//
// Existe porque quatro coisas diferentes — recordes, retrospectiva, dupla e
// conquistas — fazem a mesma pergunta ao banco de maneiras ligeiramente
// diferentes, e três versões da mesma consulta é onde nasce a estatística que
// não bate entre duas telas. Aqui a rodada tem uma forma só, montada uma vez
// (`features/rankings/historico.ts`) e lida por todo mundo.
//
// `RodadaCompleta` é superconjunto estrutural de `RodadaDoHistorico`
// (`domain/badges/conquistas.ts`) de propósito: a mesma lista alimenta as
// conquistas sem conversão.
//
// Invariante do plano §13: nível técnico não entra nesta estrutura. Nada aqui
// sabe quanto alguém joga — só o que aconteceu em campo.

export interface PartidaDoHistorico {
  matchId: string;
  /** Elenco de cada lado. É o que responde "jogaram juntos" e "jogaram contra". */
  timeA: string[];
  timeB: string[];
  golsA: number;
  golsB: number;
}

/** Assistência → gol. O par, não o total: é o que dá "quem serve quem". */
export interface PasseDoHistorico {
  de: string;
  para: string;
}

export interface RodadaCompleta {
  roundId: string;
  /** Quando a rodada foi jogada — recorte de mês e de ano saem daqui. */
  data: Date;
  /** Quem esteve confirmado. Espera e falta não contam presença. */
  presentes: string[];
  gols: Record<string, number>;
  assistencias: Record<string, number>;
  partidas: PartidaDoHistorico[];
  passes: PasseDoHistorico[];
  /** Craque calculado (`mvpDaRodada`). */
  mvpPlayerId: string | null;
  /** Eleitos no voto, quando a votação teve quórum. Vazio é o normal. */
  escolhaDaGaleraIds: string[];
  /**
   * Votos que o eleito recebeu. Só isso — nunca o placar completo: quantos
   * votos cada um teve é um ranking de popularidade com lanterna, e o voto aqui
   * é secreto por desenho (`domain/mvp/votacao.ts`).
   */
  votosDaEscolha: number;
}

/** Gols + assistências do jogador numa rodada. */
export function participacoesNaRodada(rodada: RodadaCompleta, playerId: string): number {
  return (rodada.gols[playerId] ?? 0) + (rodada.assistencias[playerId] ?? 0);
}

/** Rodadas em que o jogador esteve presente, na ordem em que vieram. */
export function rodadasDoJogador(
  rodadas: readonly RodadaCompleta[],
  playerId: string,
): RodadaCompleta[] {
  return rodadas.filter((rodada) => rodada.presentes.includes(playerId));
}

export type ResultadoDaPartida = "vitoria" | "empate" | "derrota";

/**
 * Como a partida terminou pro jogador — `null` quando ele não estava em campo.
 *
 * Partida sem gol nenhum de nenhum lado ainda é empate: 0×0 é resultado, e o
 * histórico precisa contar como jogo jogado.
 */
export function resultadoPara(
  partida: PartidaDoHistorico,
  playerId: string,
): ResultadoDaPartida | null {
  const noA = partida.timeA.includes(playerId);
  const noB = partida.timeB.includes(playerId);
  if (!noA && !noB) return null;

  const meus = noA ? partida.golsA : partida.golsB;
  const deles = noA ? partida.golsB : partida.golsA;
  if (meus > deles) return "vitoria";
  if (meus < deles) return "derrota";
  return "empate";
}

/** Os dois estavam no mesmo time nesta partida? */
export function jogaramJuntos(
  partida: PartidaDoHistorico,
  a: string,
  b: string,
): boolean {
  return (
    (partida.timeA.includes(a) && partida.timeA.includes(b)) ||
    (partida.timeB.includes(a) && partida.timeB.includes(b))
  );
}

/** Os dois estavam em lados opostos nesta partida? */
export function jogaramContra(
  partida: PartidaDoHistorico,
  a: string,
  b: string,
): boolean {
  return (
    (partida.timeA.includes(a) && partida.timeB.includes(b)) ||
    (partida.timeB.includes(a) && partida.timeA.includes(b))
  );
}
