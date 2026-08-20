import { describe, expect, it } from "vitest";
import { partida, rodada } from "./historico.fixture";
import {
  duplaDoPeriodo,
  estatisticaDaDupla,
  parceriasMaisFrequentes,
  MINIMO_DE_JOGOS_JUNTOS,
} from "./dupla";

const A = "salles";
const B = "marcos";
const C = "deivao";

/** Três rodadas: A e B juntos em quase tudo, C do outro lado. */
const historico = [
  rodada("r1", "2026-01-08T23:30:00Z", {
    presentes: [A, B, C],
    partidas: [
      partida("m1", [A, B], 3, [C], 1),
      partida("m2", [A, B], 0, [C], 2),
    ],
    passes: [
      { de: A, para: B },
      { de: A, para: B },
      { de: B, para: A },
    ],
  }),
  rodada("r2", "2026-01-15T23:30:00Z", {
    presentes: [A, B, C],
    partidas: [
      partida("m3", [A, B], 1, [C], 1),
      partida("m4", [A, C], 2, [B], 0),
    ],
    passes: [{ de: C, para: A }],
  }),
  rodada("r3", "2026-01-22T23:30:00Z", {
    presentes: [A, B, C],
    partidas: [partida("m5", [A, B], 2, [C], 0)],
  }),
];

describe("estatisticaDaDupla", () => {
  const dupla = estatisticaDaDupla(historico, A, B);

  it("conta as partidas em que caíram do mesmo lado", () => {
    expect(dupla.jogosJuntos).toBe(4);
    expect(dupla.vitoriasJuntos).toBe(2);
    expect(dupla.empatesJuntos).toBe(1);
    expect(dupla.derrotasJuntos).toBe(1);
  });

  it("calcula aproveitamento da dupla", () => {
    expect(dupla.aproveitamentoJuntos).toBeCloseTo(0.5);
  });

  it("conta quem serviu quem, nos dois sentidos", () => {
    expect(dupla.passesDeAparaB).toBe(2);
    expect(dupla.passesDeBparaA).toBe(1);
  });

  it("conta o confronto direto separado da parceria", () => {
    expect(dupla.jogosContra).toBe(1);
    expect(dupla.vitoriasDeA).toBe(1);
    expect(dupla.vitoriasDeB).toBe(0);
  });

  it("empate no confronto não vira vitória de ninguém", () => {
    const empate = [
      rodada("r", "2026-01-08T23:30:00Z", {
        presentes: [A, B],
        partidas: [partida("m", [A], 1, [B], 1)],
      }),
    ];
    const resultado = estatisticaDaDupla(empate, A, B);
    expect(resultado.empatesNoConfronto).toBe(1);
    expect(resultado.vitoriasDeA + resultado.vitoriasDeB).toBe(0);
  });

  it("a dupla consigo mesmo é vazia, não 40 jogos", () => {
    expect(estatisticaDaDupla(historico, A, A).jogosJuntos).toBe(0);
  });

  it("dois que nunca se cruzaram devolvem zeros, sem estourar", () => {
    const resultado = estatisticaDaDupla(historico, A, "fantasma");
    expect(resultado.jogosJuntos).toBe(0);
    expect(resultado.aproveitamentoJuntos).toBe(0);
  });
});

describe("parceriasMaisFrequentes", () => {
  it("ordena por quantidade de jogos juntos, não por aproveitamento", () => {
    const parcerias = parceriasMaisFrequentes(historico, A);

    expect(parcerias[0].parceiroId).toBe(B);
    expect(parcerias[0].jogosJuntos).toBe(4);
  });

  it("deixa de fora quem caiu junto poucas vezes — isso é sorteio, não dupla", () => {
    const parcerias = parceriasMaisFrequentes(historico, A);
    expect(parcerias.map((p) => p.parceiroId)).not.toContain(C);
    expect(MINIMO_DE_JOGOS_JUNTOS).toBe(3);
  });

  it("respeita o limite pedido", () => {
    expect(parceriasMaisFrequentes(historico, A, 0)).toEqual([]);
  });

  it("jogador que nunca entrou em campo não tem parceria", () => {
    expect(parceriasMaisFrequentes(historico, "fantasma")).toEqual([]);
  });
});

describe("duplaDoPeriodo", () => {
  it("elege quem mais jogou junto no período", () => {
    const dupla = duplaDoPeriodo(historico);
    expect(dupla).not.toBeNull();
    expect([dupla!.a, dupla!.b].sort()).toEqual([B, A].sort());
    expect(dupla!.jogosJuntos).toBe(4);
  });

  it("período curto demais não tem dupla — dois jogos juntos é sorteio", () => {
    const curto = [
      rodada("r1", "2026-01-08T23:30:00Z", {
        presentes: [A, B],
        partidas: [partida("m1", [A, B], 1, [C], 0)],
      }),
    ];

    expect(duplaDoPeriodo(curto)).toBeNull();
  });

  it("período sem partida nenhuma devolve null", () => {
    expect(duplaDoPeriodo([rodada("r", "2026-01-08T23:30:00Z")])).toBeNull();
  });
});
