// Cenário compartilhado pelos testes de recordes, dupla e retrospectiva.
//
// Um mesmo grupo, contado uma vez: três testes que montam três históricos
// parecidos escondem a diferença que importa quando um deles quebra.

import type { PartidaDoHistorico, RodadaCompleta } from "./historico";

export function partida(
  matchId: string,
  timeA: string[],
  golsA: number,
  timeB: string[],
  golsB: number,
): PartidaDoHistorico {
  return { matchId, timeA, golsA, timeB, golsB };
}

export function rodada(
  roundId: string,
  data: string,
  campos: Partial<Omit<RodadaCompleta, "roundId" | "data">> = {},
): RodadaCompleta {
  return {
    roundId,
    data: new Date(data),
    presentes: [],
    gols: {},
    assistencias: {},
    partidas: [],
    passes: [],
    mvpPlayerId: null,
    escolhaDaGaleraIds: [],
    votosDaEscolha: 0,
    ...campos,
  };
}
