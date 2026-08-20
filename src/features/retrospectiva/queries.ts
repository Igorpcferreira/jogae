import "server-only";

import { cache } from "react";
import { FUSO_PADRAO, instanteDoFuso, partesNoFuso } from "@/domain/time/fuso";
import { retrospectiva, type Retrospectiva } from "@/domain/statistics/retrospectiva";
import { getNomesDoGrupo } from "@/features/groups/queries";
import { getEstreantes, getHistorico } from "@/features/rankings/historico";

/**
 * Retrospectiva mensal e anual (plano §27).
 *
 * O recorte é feito **pelo fuso do app**, nunca pelo relógio do processo: um
 * mês que começa em `new Date(ano, mes, 1)` começaria à meia-noite de quem está
 * rodando, e na Vercel isso é UTC — a rodada de 31 de janeiro às 20:30 de
 * Brasília cairia em fevereiro. É a mesma armadilha do bug do 17:30.
 */

export type PeriodoDaRetrospectiva =
  | { tipo: "mes"; ano: number; mes: number }
  | { tipo: "ano"; ano: number };

export interface DestaqueComNome {
  playerIds: string[];
  nomes: string[];
  valor: number;
}

export interface RetrospectivaComNomes
  extends Omit<
    Retrospectiva,
    "artilheiros" | "garcons" | "presencas" | "craques" | "escolhasDaGalera" | "dupla" | "estreantes"
  > {
  artilheiros: DestaqueComNome;
  garcons: DestaqueComNome;
  presencas: DestaqueComNome;
  craques: DestaqueComNome;
  escolhasDaGalera: DestaqueComNome;
  dupla: { nomes: [string, string]; jogosJuntos: number; vitoriasJuntos: number } | null;
  estreantes: string[];
}

/** Início e fim do período, como instantes. Fim é exclusivo. */
export function limitesDoPeriodo(
  periodo: PeriodoDaRetrospectiva,
  fuso: string = FUSO_PADRAO,
): { de: Date; ate: Date } {
  if (periodo.tipo === "ano") {
    return {
      de: instanteDoFuso(periodo.ano, 0, 1, 0, 0, fuso),
      ate: instanteDoFuso(periodo.ano + 1, 0, 1, 0, 0, fuso),
    };
  }

  return {
    de: instanteDoFuso(periodo.ano, periodo.mes, 1, 0, 0, fuso),
    // `instanteDoFuso` aceita mês estourado, como o construtor do `Date`:
    // dezembro + 1 vira janeiro do ano seguinte sem conta especial aqui.
    ate: instanteDoFuso(periodo.ano, periodo.mes + 1, 1, 0, 0, fuso),
  };
}

export const getRetrospectiva = cache(
  async (
    groupId: string,
    periodo: PeriodoDaRetrospectiva,
    fuso: string = FUSO_PADRAO,
  ): Promise<RetrospectivaComNomes | null> => {
    const { de, ate } = limitesDoPeriodo(periodo, fuso);

    const historico = await getHistorico(groupId, { de, ate });
    if (historico.length === 0) return null;

    const [estreantes, nomes] = await Promise.all([
      getEstreantes(groupId, historico),
      getNomesDoGrupo(groupId),
    ]);

    const resumo = retrospectiva(historico, estreantes);
    if (!resumo) return null;

    const nome = (id: string) => nomes.get(id) ?? "Jogador";
    const comNome = (destaque: Retrospectiva["artilheiros"]): DestaqueComNome => ({
      playerIds: destaque.playerIds,
      nomes: destaque.playerIds.map(nome),
      valor: destaque.valor,
    });

    return {
      ...resumo,
      artilheiros: comNome(resumo.artilheiros),
      garcons: comNome(resumo.garcons),
      presencas: comNome(resumo.presencas),
      craques: comNome(resumo.craques),
      escolhasDaGalera: comNome(resumo.escolhasDaGalera),
      dupla: resumo.dupla
        ? {
            nomes: [nome(resumo.dupla.a), nome(resumo.dupla.b)],
            jogosJuntos: resumo.dupla.jogosJuntos,
            vitoriasJuntos: resumo.dupla.vitoriasJuntos,
          }
        : null,
      estreantes: resumo.estreantes.map(nome),
    };
  },
);

/**
 * Os períodos que têm rodada encerrada, do mais recente pro mais antigo.
 *
 * A tela precisa disso pra não oferecer "abril de 2024" pra um grupo que nasceu
 * em janeiro de 2026 — retrospectiva vazia é pior que aba a menos.
 */
export const getPeriodosComRodada = cache(
  async (groupId: string, fuso: string = FUSO_PADRAO) => {
    const historico = await getHistorico(groupId);

    const meses = new Map<string, { ano: number; mes: number; rodadas: number }>();
    const anos = new Map<number, number>();

    for (const rodada of historico) {
      const { ano, mes } = partesNoFuso(rodada.data, fuso);
      const chave = `${ano}-${mes}`;
      const entrada = meses.get(chave) ?? { ano, mes, rodadas: 0 };
      entrada.rodadas += 1;
      meses.set(chave, entrada);
      anos.set(ano, (anos.get(ano) ?? 0) + 1);
    }

    return {
      meses: [...meses.values()].sort((a, b) => b.ano - a.ano || b.mes - a.mes),
      anos: [...anos.entries()]
        .map(([ano, rodadas]) => ({ ano, rodadas }))
        .sort((a, b) => b.ano - a.ano),
    };
  },
);
