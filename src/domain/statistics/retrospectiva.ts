// Retrospectiva mensal e anual do grupo (plano §27).
//
// É o "o que aconteceu por aqui" que se manda no grupo no fim do mês. A mesma
// função serve pro mês e pro ano — quem recorta o período é quem consulta o
// banco; aqui só chega uma lista de rodadas em ordem cronológica.
//
// Duas decisões que a regra do plano ("leve e positiva") impõe:
//
// - **Nada de pior de nada.** Não tem "quem mais faltou", não tem "time que
//   mais tomou gol", não tem jejum. Os números do grupo são do grupo; os
//   destaques individuais são todos superlativos positivos.
// - **Destaque com muita gente empatada não é destaque.** Reaproveita
//   `liderancaCompartilhada` de `domain/badges`, que já resolve isso — dois
//   artilheiros é resenha, seis é uma lista.
//
// O que a retrospectiva **não** faz é inventar número: se o período teve uma
// rodada só, ela mostra os números de uma rodada e omite o que não faz sentido
// (dupla do período, por exemplo, exige repetição).

import { liderancaCompartilhada } from "@/domain/badges/conquistas";
import { duplaDoPeriodo, type DuplaDoPeriodo } from "./dupla";
import type { RodadaCompleta } from "./historico";

export interface DestaqueCompartilhado {
  playerIds: string[];
  valor: number;
}

export interface JogoMarcante {
  roundId: string;
  matchId: string;
  /** Gols dos dois lados somados. */
  gols: number;
  golsA: number;
  golsB: number;
}

export interface Retrospectiva {
  rodadas: number;
  partidas: number;
  gols: number;
  /** Quantas pessoas diferentes jogaram no período. */
  jogadores: number;
  /** Média de gols por partida, com uma casa. */
  golsPorPartida: number;
  artilheiros: DestaqueCompartilhado;
  garcons: DestaqueCompartilhado;
  /** Quem mais compareceu. Presença é o destaque mais democrático que existe. */
  presencas: DestaqueCompartilhado;
  /** Quem mais foi craque da rodada no período. */
  craques: DestaqueCompartilhado;
  /** Quem mais foi escolhido pela galera no período. */
  escolhasDaGalera: DestaqueCompartilhado;
  /** A partida com mais gols — "o jogo que ninguém segurou". */
  jogoMaisMovimentado: JogoMarcante | null;
  dupla: DuplaDoPeriodo | null;
  /** Quem jogou a primeira rodada da vida dele no período. */
  estreantes: string[];
}

const SEM_DESTAQUE: DestaqueCompartilhado = { playerIds: [], valor: 0 };

function contar(
  rodadas: readonly RodadaCompleta[],
  valorDe: (rodada: RodadaCompleta) => Iterable<[string, number]>,
): Map<string, number> {
  const total = new Map<string, number>();
  for (const rodada of rodadas) {
    for (const [playerId, quantidade] of valorDe(rodada)) {
      total.set(playerId, (total.get(playerId) ?? 0) + quantidade);
    }
  }
  return total;
}

/**
 * O período inteiro num objeto só.
 *
 * `estreantes` vem de fora porque a pergunta "foi a primeira rodada da vida
 * dele?" atravessa o recorte: quem consulta o banco sabe se o cara já jogava
 * antes de janeiro, esta função não.
 *
 * Devolve `null` pra período sem rodada nenhuma — retrospectiva de mês vazio é
 * uma tela dizendo "não teve fut", e quem escreve isso é a tela.
 */
export function retrospectiva(
  rodadas: readonly RodadaCompleta[],
  estreantes: readonly string[] = [],
): Retrospectiva | null {
  if (rodadas.length === 0) return null;

  const partidas = rodadas.flatMap((rodada) =>
    rodada.partidas.map((partida) => ({ roundId: rodada.roundId, partida })),
  );

  const gols = partidas.reduce(
    (soma, { partida }) => soma + partida.golsA + partida.golsB,
    0,
  );

  const jogadores = new Set<string>();
  for (const rodada of rodadas) for (const id of rodada.presentes) jogadores.add(id);

  const artilheiros = liderancaCompartilhada(
    contar(rodadas, (rodada) => Object.entries(rodada.gols)),
  );
  const garcons = liderancaCompartilhada(
    contar(rodadas, (rodada) => Object.entries(rodada.assistencias)),
  );
  const presencas = liderancaCompartilhada(
    contar(rodadas, (rodada) => rodada.presentes.map((id) => [id, 1] as [string, number])),
  );
  const craques = liderancaCompartilhada(
    contar(rodadas, (rodada) =>
      rodada.mvpPlayerId ? [[rodada.mvpPlayerId, 1] as [string, number]] : [],
    ),
  );
  const escolhas = liderancaCompartilhada(
    contar(rodadas, (rodada) =>
      rodada.escolhaDaGaleraIds.map((id) => [id, 1] as [string, number]),
    ),
  );

  let jogoMaisMovimentado: JogoMarcante | null = null;
  for (const { roundId, partida } of partidas) {
    const total = partida.golsA + partida.golsB;
    // `>` mantém o primeiro em caso de empate: o jogo que estabeleceu a marca.
    if (total > (jogoMaisMovimentado?.gols ?? 0)) {
      jogoMaisMovimentado = {
        roundId,
        matchId: partida.matchId,
        gols: total,
        golsA: partida.golsA,
        golsB: partida.golsB,
      };
    }
  }

  return {
    rodadas: rodadas.length,
    partidas: partidas.length,
    gols,
    jogadores: jogadores.size,
    golsPorPartida:
      partidas.length > 0 ? Math.round((gols / partidas.length) * 10) / 10 : 0,
    artilheiros: artilheiros.playerIds.length > 0 ? artilheiros : SEM_DESTAQUE,
    garcons: garcons.playerIds.length > 0 ? garcons : SEM_DESTAQUE,
    presencas: presencas.playerIds.length > 0 ? presencas : SEM_DESTAQUE,
    craques: craques.playerIds.length > 0 ? craques : SEM_DESTAQUE,
    escolhasDaGalera: escolhas.playerIds.length > 0 ? escolhas : SEM_DESTAQUE,
    jogoMaisMovimentado,
    dupla: duplaDoPeriodo(rodadas),
    estreantes: [...estreantes].sort((a, b) => a.localeCompare(b)),
  };
}
