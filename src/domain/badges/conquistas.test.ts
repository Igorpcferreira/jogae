import { describe, expect, it } from "vitest";
import {
  CONQUISTAS,
  conquistasDaRodada,
  conquistasDoPeriodo,
  conquistasPorJogador,
  liderancaCompartilhada,
  sequenciaDePresenca,
  type Conquista,
  type RodadaDoHistorico,
} from "./conquistas";

function rodada(
  roundId: string,
  entrada: Partial<Omit<RodadaDoHistorico, "roundId">> = {},
): RodadaDoHistorico {
  return {
    roundId,
    presentes: entrada.presentes ?? [],
    gols: entrada.gols ?? {},
    assistencias: entrada.assistencias ?? {},
    mvpPlayerId: entrada.mvpPlayerId ?? null,
    escolhaDaGaleraIds: entrada.escolhaDaGaleraIds ?? [],
    votosDaEscolha: entrada.votosDaEscolha,
  };
}

const de = (conquistas: Conquista[], tipo: string) =>
  conquistas.filter((conquista) => conquista.tipo === tipo);

/* ── Artilheiro e garçom ───────────────────────────────────── */

describe("artilheiro do mês", () => {
  it("coroa quem fez mais gols somando as rodadas", () => {
    const conquistas = conquistasDoPeriodo([
      rodada("r1", { presentes: ["a", "b"], gols: { a: 2, b: 1 } }),
      rodada("r2", { presentes: ["a", "b"], gols: { a: 1, b: 3 } }),
    ]);

    expect(de(conquistas, "artilheiro")).toEqual([
      { tipo: "artilheiro", playerId: "b", valor: 4 },
    ]);
  });

  it("empate divide a conquista em vez de escolher um", () => {
    const conquistas = conquistasDoPeriodo([
      rodada("r1", { presentes: ["a", "b"], gols: { a: 3, b: 3 } }),
    ]);

    expect(de(conquistas, "artilheiro").map((c) => c.playerId)).toEqual(["a", "b"]);
  });

  it("empate de gente demais não coroa ninguém", () => {
    const conquistas = conquistasDoPeriodo([
      rodada("r1", {
        presentes: ["a", "b", "c", "d"],
        gols: { a: 1, b: 1, c: 1, d: 1 },
      }),
    ]);

    expect(de(conquistas, "artilheiro")).toEqual([]);
  });

  it("mês sem gol nenhum não inventa artilheiro", () => {
    const conquistas = conquistasDoPeriodo([rodada("r1", { presentes: ["a", "b"] })]);
    expect(de(conquistas, "artilheiro")).toEqual([]);
  });

  it("garçom é a mesma regra, com assistência", () => {
    const conquistas = conquistasDoPeriodo([
      rodada("r1", {
        presentes: ["a", "b"],
        gols: { a: 5 },
        assistencias: { b: 4, a: 1 },
      }),
    ]);

    expect(de(conquistas, "garcom")).toEqual([
      { tipo: "garcom", playerId: "b", valor: 4 },
    ]);
    // Artilheiro e garçom são conquistas distintas: o mesmo cara pode não levar as duas.
    expect(de(conquistas, "artilheiro")[0].playerId).toBe("a");
  });
});

describe("liderancaCompartilhada", () => {
  it("ignora quem está zerado", () => {
    expect(liderancaCompartilhada(new Map([["a", 0], ["b", 0]]))).toEqual({
      playerIds: [],
      valor: 0,
    });
  });

  it("devolve o valor do topo junto com quem chegou lá", () => {
    expect(
      liderancaCompartilhada(new Map([["a", 2], ["b", 7], ["c", 7]])),
    ).toEqual({ playerIds: ["b", "c"], valor: 7 });
  });
});

/* ── Presença de ferro ─────────────────────────────────────── */

describe("presença de ferro", () => {
  const quatro = [
    rodada("r1", { presentes: ["a", "b"] }),
    rodada("r2", { presentes: ["a", "b"] }),
    rodada("r3", { presentes: ["a"] }),
    rodada("r4", { presentes: ["a", "b"] }),
  ];

  it("conta rodadas seguidas até a última", () => {
    expect(sequenciaDePresenca(quatro, "a")).toBe(4);
  });

  it("falta no meio zera o que veio antes", () => {
    // "b" faltou na r3: a sequência atual dele é só a r4.
    expect(sequenciaDePresenca(quatro, "b")).toBe(1);
  });

  it("faltar na última rodada zera a sequência", () => {
    const rodadas = [...quatro, rodada("r5", { presentes: ["b"] })];
    expect(sequenciaDePresenca(rodadas, "a")).toBe(0);
  });

  it("quem chegou depois tem a sequência que dá, e não ganha por isso", () => {
    const rodadas = [
      rodada("r1", { presentes: ["a"] }),
      rodada("r2", { presentes: ["a"] }),
      rodada("r3", { presentes: ["a", "novato"] }),
      rodada("r4", { presentes: ["a", "novato"] }),
    ];

    expect(sequenciaDePresenca(rodadas, "novato")).toBe(2);
    expect(
      de(conquistasDoPeriodo(rodadas), "presenca-de-ferro").map((c) => c.playerId),
    ).toEqual(["a"]);
  });

  it("não é disputa: todo mundo que bateu a marca leva", () => {
    const rodadas = Array.from({ length: 5 }, (_, i) =>
      rodada(`r${i}`, { presentes: ["a", "b", "c"] }),
    );

    expect(
      de(conquistasDoPeriodo(rodadas), "presenca-de-ferro").map((c) => c.playerId),
    ).toEqual(["a", "b", "c"]);
  });

  it("três rodadas ainda não é ferro", () => {
    const rodadas = Array.from({ length: 3 }, (_, i) =>
      rodada(`r${i}`, { presentes: ["a"] }),
    );
    expect(de(conquistasDoPeriodo(rodadas), "presenca-de-ferro")).toEqual([]);
  });
});

/* ── Conquistas de uma rodada ──────────────────────────────── */

describe("conquistas da rodada", () => {
  it("hat-trick sai a partir de três gols", () => {
    const conquistas = conquistasDaRodada(
      rodada("r1", { presentes: ["a", "b"], gols: { a: 3, b: 2 } }),
    );

    expect(de(conquistas, "hat-trick")).toEqual([
      { tipo: "hat-trick", playerId: "a", valor: 3, roundId: "r1" },
    ]);
  });

  it("dois hat-tricks na mesma rodada saem os dois, do maior pro menor", () => {
    const conquistas = conquistasDaRodada(
      rodada("r1", { presentes: ["a", "b"], gols: { a: 3, b: 5 } }),
    );

    expect(de(conquistas, "hat-trick").map((c) => c.playerId)).toEqual(["b", "a"]);
  });

  it("craque da rodada vem do MVP já decidido, com a participação em gol", () => {
    const conquistas = conquistasDaRodada(
      rodada("r1", {
        presentes: ["a"],
        gols: { a: 2 },
        assistencias: { a: 1 },
        mvpPlayerId: "a",
      }),
    );

    expect(de(conquistas, "mvp")).toEqual([
      { tipo: "mvp", playerId: "a", valor: 3, roundId: "r1" },
    ]);
  });

  it("rodada sem MVP não inventa craque", () => {
    const conquistas = conquistasDaRodada(
      rodada("r1", { presentes: ["a"], gols: { a: 1 }, mvpPlayerId: null }),
    );
    expect(de(conquistas, "mvp")).toEqual([]);
  });

  it("grupo inteiro estreando não é estreia de ninguém", () => {
    // A primeira rodada da vida do grupo: todo mundo é estreante, e 20
    // medalhas iguais não são medalha.
    const elenco = ["a", "b", "c", "d", "e"];
    const conquistas = conquistasDaRodada(
      rodada("r1", { presentes: elenco }),
      elenco,
    );

    expect(de(conquistas, "estreia")).toEqual([]);
  });

  it("um novato num grupo rodado ganha a estreia", () => {
    const conquistas = conquistasDaRodada(
      rodada("r9", { presentes: ["a", "b", "c", "novato"] }),
      ["novato"],
    );

    expect(de(conquistas, "estreia")).toEqual([
      { tipo: "estreia", playerId: "novato", valor: 1, roundId: "r9" },
    ]);
  });

  it("estreia é de quem jogou, não de quem entrou no elenco", () => {
    const conquistas = conquistasDaRodada(
      rodada("r1", { presentes: ["estreante"] }),
      ["estreante", "so-cadastrado"],
    );

    expect(de(conquistas, "estreia").map((c) => c.playerId)).toEqual(["estreante"]);
  });
});

/* ── Regra do plano: nada negativo ─────────────────────────── */

describe("gamificação leve e positiva (plano §27)", () => {
  it("todo tipo de conquista tem rótulo, descrição e cor do design system", () => {
    for (const [tipo, meta] of Object.entries(CONQUISTAS)) {
      expect(meta.rotulo.length, tipo).toBeGreaterThan(0);
      expect(meta.descricao(3).length, tipo).toBeGreaterThan(0);
      expect(["green", "yellow", "red", "pink"]).toContain(meta.tom);
    }
  });

  it("nenhuma conquista nasce de fazer pouco: o pior desempenho não é premiado", () => {
    // O elenco inteiro zerado não gera conquista nenhuma — nem "artilheiro
    // de 0 gols", nem qualquer coisa por baixo desempenho.
    const conquistas = [
      ...conquistasDoPeriodo([rodada("r1", { presentes: ["a", "b", "c"] })]),
      ...conquistasDaRodada(rodada("r1", { presentes: ["a", "b", "c"] })),
    ];
    expect(conquistas).toEqual([]);
  });
});

describe("escolha da galera", () => {
  it("vira conquista com o número de votos", () => {
    const conquistas = conquistasDaRodada(
      rodada("r1", {
        presentes: ["a", "b"],
        escolhaDaGaleraIds: ["b"],
        votosDaEscolha: 7,
      }),
    );

    expect(de(conquistas, "escolha-da-galera")).toEqual([
      { tipo: "escolha-da-galera", playerId: "b", valor: 7, roundId: "r1" },
    ]);
  });

  it("empate na urna divide a conquista", () => {
    const conquistas = conquistasDaRodada(
      rodada("r1", {
        presentes: ["a", "b", "c"],
        escolhaDaGaleraIds: ["b", "c"],
        votosDaEscolha: 4,
      }),
    );

    expect(de(conquistas, "escolha-da-galera").map((c) => c.playerId)).toEqual(["b", "c"]);
  });

  it("convive com o craque calculado — os dois medem coisas diferentes", () => {
    const conquistas = conquistasDaRodada(
      rodada("r1", {
        presentes: ["a", "b"],
        gols: { a: 2 },
        mvpPlayerId: "a",
        escolhaDaGaleraIds: ["b"],
        votosDaEscolha: 5,
      }),
    );

    expect(de(conquistas, "mvp")).toHaveLength(1);
    expect(de(conquistas, "escolha-da-galera")).toHaveLength(1);
  });

  it("rodada sem votação não produz conquista de voto", () => {
    const conquistas = conquistasDaRodada(rodada("r1", { presentes: ["a", "b"] }));
    expect(de(conquistas, "escolha-da-galera")).toEqual([]);
  });
});

describe("conquistasPorJogador", () => {
  it("agrupa mantendo a ordem em que a conquista foi calculada", () => {
    const conquistas: Conquista[] = [
      { tipo: "artilheiro", playerId: "a", valor: 5 },
      { tipo: "garcom", playerId: "b", valor: 3 },
      { tipo: "hat-trick", playerId: "a", valor: 3, roundId: "r1" },
    ];

    const porJogador = conquistasPorJogador(conquistas);
    expect(porJogador.get("a")?.map((c) => c.tipo)).toEqual(["artilheiro", "hat-trick"]);
    expect(porJogador.get("b")).toHaveLength(1);
    expect(porJogador.has("c")).toBe(false);
  });
});
