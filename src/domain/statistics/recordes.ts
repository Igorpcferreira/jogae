// Recordes pessoais e "melhor mês" (plano §27).
//
// A regra do plano — *"gamificação leve e positiva, evitar mecânicas que gerem
// conflito"* — manda mais aqui do que em qualquer outro módulo da Fase 2, e a
// tradução é literal: **todo recorde é um melhor**. Não existe "pior rodada",
// "mês mais fraco" nem sequência de jogos sem marcar. Recorde é a marca que a
// pessoa quer bater de novo, nunca a que ela quer esquecer.
//
// A segunda decisão é que **recorde é do jogador contra ele mesmo**. Nada aqui
// compara duas pessoas — isso é assunto do ranking, que já existe e já é
// público. Recorde pessoal serve pra você ver que melhorou.
//
// Nada disso vira coluna: tudo é recalculado do histórico. Um grupo semanal faz
// ~50 rodadas por ano, e a consulta que alimenta isto é a mesma do ranking.
// Coluna só economizaria leitura que hoje não custa nada, e coluna
// desatualizada mente — recorde que sobrevive a um "desfazer lance" é pior que
// recorde recalculado.

import { partesNoFuso } from "@/domain/time/fuso";
import {
  participacoesNaRodada,
  resultadoPara,
  type RodadaCompleta,
} from "./historico";

export type TipoDeRecorde =
  | "gols-na-rodada"
  | "assistencias-na-rodada"
  | "participacoes-na-rodada"
  | "vitorias-na-rodada"
  | "sequencia-de-presenca";

export interface Recorde {
  tipo: TipoDeRecorde;
  valor: number;
  /** Rodada da marca — ausente na sequência, que atravessa várias. */
  roundId?: string;
  data?: Date;
}

export const RECORDES: Record<
  TipoDeRecorde,
  {
    rotulo: string;
    descricao: (valor: number) => string;
    /** Cor semântica do design system (plano §42). */
    tom: "green" | "yellow" | "red" | "pink";
    emoji: string;
    /** Abaixo disso não é recorde, é terça-feira. */
    minimo: number;
  }
> = {
  "gols-na-rodada": {
    rotulo: "Mais gols numa rodada",
    descricao: (valor) => (valor === 1 ? "1 gol" : `${valor} gols`),
    tom: "red",
    emoji: "⚽",
    minimo: 2,
  },
  "assistencias-na-rodada": {
    rotulo: "Mais assistências numa rodada",
    descricao: (valor) => (valor === 1 ? "1 assistência" : `${valor} assistências`),
    tom: "yellow",
    emoji: "👟",
    minimo: 2,
  },
  "participacoes-na-rodada": {
    rotulo: "Mais participações numa rodada",
    descricao: (valor) => `${valor} entre gols e assistências`,
    tom: "pink",
    emoji: "🎯",
    minimo: 3,
  },
  "vitorias-na-rodada": {
    rotulo: "Mais vitórias numa rodada",
    descricao: (valor) => (valor === 1 ? "1 vitória" : `${valor} vitórias`),
    tom: "green",
    emoji: "🏆",
    minimo: 3,
  },
  "sequencia-de-presenca": {
    rotulo: "Maior sequência de presença",
    descricao: (valor) => `${valor} rodadas seguidas`,
    tom: "green",
    emoji: "🔥",
    minimo: 3,
  },
};

/**
 * A maior sequência de presenças de **toda a história** do jogador.
 *
 * Diferente de `sequenciaDePresenca` (`domain/badges`), que conta a sequência
 * *atual*, de trás pra frente: aquela é a conquista viva ("você está há 6
 * rodadas sem faltar"), esta é a marca ("seu recorde é 11"). As duas existem
 * porque respondem perguntas diferentes, e faltar zera uma sem tocar na outra.
 *
 * A contagem começa na primeira rodada em que a pessoa apareceu: quem entrou no
 * grupo em março não tem falta em janeiro.
 */
export function maiorSequenciaDePresenca(
  rodadas: readonly RodadaCompleta[],
  playerId: string,
): number {
  let maior = 0;
  let atual = 0;
  let comecou = false;

  for (const rodada of rodadas) {
    if (rodada.presentes.includes(playerId)) {
      comecou = true;
      atual += 1;
      maior = Math.max(maior, atual);
    } else if (comecou) {
      atual = 0;
    }
  }

  return maior;
}

export interface MelhorMes {
  ano: number;
  /** 0–11, como `partesNoFuso` e `Date#getMonth`. A tela é quem dá nome ao mês. */
  mes: number;
  rodadas: number;
  gols: number;
  assistencias: number;
  participacoes: number;
}

/**
 * O melhor mês do jogador, medido por participação em gol.
 *
 * Participação e não gol porque o goleiro e o zagueiro também têm um melhor
 * mês, e um módulo que só enxerga artilheiro deixa metade do grupo de fora.
 *
 * Empate fica com o mês mais recente: a marca é a mesma, e "seu melhor mês foi
 * agora" motiva mais que uma data de dois anos atrás.
 *
 * O mês sai de `partesNoFuso`, nunca de `getMonth()`: na Vercel (UTC) uma
 * rodada de 31 de janeiro às 20:30 de Brasília cairia em fevereiro e trocaria o
 * melhor mês de lugar. Mesma armadilha do bug do 17:30.
 *
 * Mês em que a pessoa jogou mas não participou de gol nenhum não é "o melhor" —
 * devolve `null` em vez de coroar um zero.
 */
export function melhorMesDoJogador(
  rodadas: readonly RodadaCompleta[],
  playerId: string,
  fuso: string,
): MelhorMes | null {
  const porMes = new Map<string, MelhorMes>();

  for (const rodada of rodadas) {
    if (!rodada.presentes.includes(playerId)) continue;

    const { ano, mes } = partesNoFuso(rodada.data, fuso);
    const chave = `${ano}-${mes}`;
    const entrada = porMes.get(chave) ?? {
      ano,
      mes,
      rodadas: 0,
      gols: 0,
      assistencias: 0,
      participacoes: 0,
    };

    entrada.rodadas += 1;
    entrada.gols += rodada.gols[playerId] ?? 0;
    entrada.assistencias += rodada.assistencias[playerId] ?? 0;
    entrada.participacoes = entrada.gols + entrada.assistencias;
    porMes.set(chave, entrada);
  }

  let melhor: MelhorMes | null = null;
  for (const mes of porMes.values()) {
    if (mes.participacoes === 0) continue;
    const ganha =
      !melhor ||
      mes.participacoes > melhor.participacoes ||
      (mes.participacoes === melhor.participacoes &&
        (mes.ano > melhor.ano || (mes.ano === melhor.ano && mes.mes > melhor.mes)));
    if (ganha) melhor = mes;
  }

  return melhor;
}

/**
 * Todos os recordes do jogador.
 *
 * Marca abaixo do mínimo do tipo simplesmente não aparece: "seu recorde é 1 gol
 * numa rodada" não é recorde, é constrangimento com outro nome.
 */
export function recordesDoJogador(
  rodadas: readonly RodadaCompleta[],
  playerId: string,
): Recorde[] {
  const recordes: Recorde[] = [];

  const melhorPorRodada = (
    tipo: TipoDeRecorde,
    valorDe: (rodada: RodadaCompleta) => number,
  ) => {
    let melhor: Recorde | null = null;
    for (const rodada of rodadas) {
      if (!rodada.presentes.includes(playerId)) continue;
      const valor = valorDe(rodada);
      // `>` e não `>=`: empate fica com a primeira vez, que é quando a marca
      // foi estabelecida.
      if (valor > (melhor?.valor ?? 0)) {
        melhor = { tipo, valor, roundId: rodada.roundId, data: rodada.data };
      }
    }
    if (melhor && melhor.valor >= RECORDES[tipo].minimo) recordes.push(melhor);
  };

  melhorPorRodada("gols-na-rodada", (rodada) => rodada.gols[playerId] ?? 0);
  melhorPorRodada(
    "assistencias-na-rodada",
    (rodada) => rodada.assistencias[playerId] ?? 0,
  );
  melhorPorRodada("participacoes-na-rodada", (rodada) =>
    participacoesNaRodada(rodada, playerId),
  );
  melhorPorRodada(
    "vitorias-na-rodada",
    (rodada) =>
      rodada.partidas.filter((partida) => resultadoPara(partida, playerId) === "vitoria")
        .length,
  );

  const sequencia = maiorSequenciaDePresenca(rodadas, playerId);
  if (sequencia >= RECORDES["sequencia-de-presenca"].minimo) {
    recordes.push({ tipo: "sequencia-de-presenca", valor: sequencia });
  }

  return recordes;
}
