import { describe, expect, it } from "vitest";
import { FUSO_PADRAO } from "@/domain/time/fuso";
import { partida, rodada } from "./historico.fixture";
import {
  maiorSequenciaDePresenca,
  melhorMesDoJogador,
  recordesDoJogador,
  RECORDES,
} from "./recordes";

const SALLES = "salles";
const MARCOS = "marcos";

describe("maiorSequenciaDePresenca", () => {
  it("conta a maior sequência da história, não a atual", () => {
    // Presente nas 4 primeiras, falta, volta em 1: a atual é 1, o recorde é 4.
    const rodadas = [
      rodada("r1", "2026-01-08T23:30:00Z", { presentes: [SALLES] }),
      rodada("r2", "2026-01-15T23:30:00Z", { presentes: [SALLES] }),
      rodada("r3", "2026-01-22T23:30:00Z", { presentes: [SALLES] }),
      rodada("r4", "2026-01-29T23:30:00Z", { presentes: [SALLES] }),
      rodada("r5", "2026-02-05T23:30:00Z", { presentes: [MARCOS] }),
      rodada("r6", "2026-02-12T23:30:00Z", { presentes: [SALLES] }),
    ];

    expect(maiorSequenciaDePresenca(rodadas, SALLES)).toBe(4);
  });

  it("não conta como falta a rodada anterior à chegada do jogador", () => {
    const rodadas = [
      rodada("r1", "2026-01-08T23:30:00Z", { presentes: [MARCOS] }),
      rodada("r2", "2026-01-15T23:30:00Z", { presentes: [MARCOS] }),
      rodada("r3", "2026-01-22T23:30:00Z", { presentes: [MARCOS, SALLES] }),
      rodada("r4", "2026-01-29T23:30:00Z", { presentes: [MARCOS, SALLES] }),
    ];

    expect(maiorSequenciaDePresenca(rodadas, SALLES)).toBe(2);
  });

  it("quem nunca jogou não tem sequência", () => {
    const rodadas = [rodada("r1", "2026-01-08T23:30:00Z", { presentes: [MARCOS] })];
    expect(maiorSequenciaDePresenca(rodadas, SALLES)).toBe(0);
  });
});

describe("melhorMesDoJogador", () => {
  it("escolhe o mês de mais participação em gol", () => {
    const rodadas = [
      rodada("r1", "2026-01-08T23:30:00Z", {
        presentes: [SALLES],
        gols: { [SALLES]: 2 },
      }),
      rodada("r2", "2026-02-05T23:30:00Z", {
        presentes: [SALLES],
        gols: { [SALLES]: 1 },
        assistencias: { [SALLES]: 3 },
      }),
    ];

    const melhor = melhorMesDoJogador(rodadas, SALLES, FUSO_PADRAO);

    // Mês 1 = fevereiro (0–11, como `partesNoFuso`).
    expect(melhor).toEqual({
      ano: 2026,
      mes: 1,
      rodadas: 1,
      gols: 1,
      assistencias: 3,
      participacoes: 4,
    });
  });

  it("conta assistência junto com gol — goleiro e zagueiro também têm melhor mês", () => {
    const rodadas = [
      rodada("r1", "2026-03-05T23:30:00Z", {
        presentes: [SALLES],
        assistencias: { [SALLES]: 2 },
      }),
    ];

    expect(melhorMesDoJogador(rodadas, SALLES, FUSO_PADRAO)?.participacoes).toBe(2);
  });

  it("empate fica com o mês mais recente", () => {
    const rodadas = [
      rodada("r1", "2026-01-08T23:30:00Z", {
        presentes: [SALLES],
        gols: { [SALLES]: 2 },
      }),
      rodada("r2", "2026-04-09T23:30:00Z", {
        presentes: [SALLES],
        gols: { [SALLES]: 2 },
      }),
    ];

    expect(melhorMesDoJogador(rodadas, SALLES, FUSO_PADRAO)?.mes).toBe(3);
  });

  it("mês sem participação nenhuma não é o melhor de ninguém", () => {
    const rodadas = [rodada("r1", "2026-01-08T23:30:00Z", { presentes: [SALLES] })];

    expect(melhorMesDoJogador(rodadas, SALLES, FUSO_PADRAO)).toBeNull();
  });

  it("usa o fuso declarado, não o do processo", () => {
    // 01/02 às 01:30 UTC = 31/01 às 22:30 em Brasília. O mês tem que ser
    // janeiro (0), senão o melhor mês troca de lugar em produção.
    const rodadas = [
      rodada("r1", "2026-02-01T01:30:00Z", {
        presentes: [SALLES],
        gols: { [SALLES]: 1 },
      }),
    ];

    expect(melhorMesDoJogador(rodadas, SALLES, FUSO_PADRAO)?.mes).toBe(0);
  });
});

describe("recordesDoJogador", () => {
  const historico = [
    rodada("r1", "2026-01-08T23:30:00Z", {
      presentes: [SALLES, MARCOS],
      gols: { [SALLES]: 3, [MARCOS]: 1 },
      assistencias: { [SALLES]: 1 },
      partidas: [
        partida("m1", [SALLES], 3, [MARCOS], 1),
        partida("m2", [SALLES], 2, [MARCOS], 0),
        partida("m3", [SALLES], 1, [MARCOS], 4),
      ],
    }),
    rodada("r2", "2026-01-15T23:30:00Z", {
      presentes: [SALLES, MARCOS],
      gols: { [SALLES]: 1 },
      assistencias: { [SALLES]: 2 },
      partidas: [partida("m4", [SALLES], 1, [MARCOS], 0)],
    }),
    rodada("r3", "2026-01-22T23:30:00Z", {
      presentes: [SALLES, MARCOS],
      partidas: [partida("m5", [SALLES], 0, [MARCOS], 0)],
    }),
  ];

  const porTipo = (playerId: string) =>
    new Map(recordesDoJogador(historico, playerId).map((r) => [r.tipo, r]));

  it("guarda a melhor rodada de gols, com a rodada em que aconteceu", () => {
    const recorde = porTipo(SALLES).get("gols-na-rodada");
    expect(recorde?.valor).toBe(3);
    expect(recorde?.roundId).toBe("r1");
  });

  it("guarda a melhor rodada de assistências", () => {
    expect(porTipo(SALLES).get("assistencias-na-rodada")?.valor).toBe(2);
  });

  it("participação soma gol e assistência da mesma rodada", () => {
    expect(porTipo(SALLES).get("participacoes-na-rodada")?.valor).toBe(4);
  });

  it("conta vitórias na rodada pelas partidas, não pelo placar somado", () => {
    expect(porTipo(SALLES).get("vitorias-na-rodada")).toBeUndefined();
    // Salles venceu 2 de 3 em r1 — abaixo do mínimo de 3, então não vira recorde.
    expect(RECORDES["vitorias-na-rodada"].minimo).toBe(3);
  });

  it("marca abaixo do mínimo não vira recorde — 1 gol não é recorde de ninguém", () => {
    expect(porTipo(MARCOS).get("gols-na-rodada")).toBeUndefined();
  });

  it("sequência entra como recorde quando alcança o mínimo", () => {
    expect(porTipo(SALLES).get("sequencia-de-presenca")?.valor).toBe(3);
  });

  it("jogador sem nada relevante não recebe recorde nenhum de gol", () => {
    const recordes = recordesDoJogador(historico, "ninguem");
    expect(recordes).toEqual([]);
  });

  it("empate na marca fica com a primeira vez que aconteceu", () => {
    const empatado = [
      rodada("a", "2026-01-08T23:30:00Z", {
        presentes: [SALLES],
        gols: { [SALLES]: 2 },
      }),
      rodada("b", "2026-01-15T23:30:00Z", {
        presentes: [SALLES],
        gols: { [SALLES]: 2 },
      }),
    ];

    expect(
      recordesDoJogador(empatado, SALLES).find((r) => r.tipo === "gols-na-rodada")?.roundId,
    ).toBe("a");
  });

  it("todo recorde é um superlativo positivo — nenhum tipo mede fracasso", () => {
    // A regra do plano vira teste: se alguém adicionar "pior rodada" aqui,
    // este teste cai junto com a decisão que ele protege.
    for (const definicao of Object.values(RECORDES)) {
      expect(definicao.rotulo).toMatch(/^(Mais|Maior)/);
    }
  });
});
