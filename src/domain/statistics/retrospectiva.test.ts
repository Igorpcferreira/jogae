import { describe, expect, it } from "vitest";
import { partida, rodada } from "./historico.fixture";
import { retrospectiva } from "./retrospectiva";

const A = "salles";
const B = "marcos";
const C = "deivao";

const historico = [
  rodada("r1", "2026-01-08T23:30:00Z", {
    presentes: [A, B, C],
    gols: { [A]: 3, [B]: 1 },
    assistencias: { [B]: 2 },
    mvpPlayerId: A,
    escolhaDaGaleraIds: [C],
    partidas: [
      partida("m1", [A, B], 3, [C], 1),
      partida("m2", [A, B], 1, [C], 0),
    ],
  }),
  rodada("r2", "2026-01-15T23:30:00Z", {
    presentes: [A, B],
    gols: { [A]: 1 },
    assistencias: { [B]: 1 },
    mvpPlayerId: A,
    partidas: [partida("m3", [A, B], 4, [C], 5)],
  }),
  rodada("r3", "2026-01-22T23:30:00Z", {
    presentes: [A, B, C],
    partidas: [partida("m4", [A, B], 0, [C], 0)],
  }),
];

describe("retrospectiva", () => {
  const resumo = retrospectiva(historico, [C])!;

  it("período vazio não tem retrospectiva", () => {
    expect(retrospectiva([])).toBeNull();
  });

  it("conta os números do grupo", () => {
    expect(resumo.rodadas).toBe(3);
    expect(resumo.partidas).toBe(4);
    expect(resumo.gols).toBe(14);
    expect(resumo.jogadores).toBe(3);
  });

  it("arredonda gols por partida com uma casa", () => {
    expect(resumo.golsPorPartida).toBe(3.5);
  });

  it("elege artilheiro e garçom do período", () => {
    expect(resumo.artilheiros).toEqual({ playerIds: [A], valor: 4 });
    expect(resumo.garcons).toEqual({ playerIds: [B], valor: 3 });
  });

  it("destaca quem mais compareceu, empate incluído", () => {
    expect(resumo.presencas.valor).toBe(3);
    expect(resumo.presencas.playerIds.sort()).toEqual([A, B].sort());
  });

  it("conta quantas vezes cada um foi craque", () => {
    expect(resumo.craques).toEqual({ playerIds: [A], valor: 2 });
  });

  it("conta as escolhas da galera separadas do craque calculado", () => {
    expect(resumo.escolhasDaGalera).toEqual({ playerIds: [C], valor: 1 });
  });

  it("acha o jogo mais movimentado", () => {
    expect(resumo.jogoMaisMovimentado).toEqual({
      roundId: "r2",
      matchId: "m3",
      gols: 9,
      golsA: 4,
      golsB: 5,
    });
  });

  it("elege a dupla do período", () => {
    expect(resumo.dupla?.jogosJuntos).toBe(4);
  });

  it("lista os estreantes que vieram de fora", () => {
    expect(resumo.estreantes).toEqual([C]);
  });

  it("período sem gol nenhum não coroa artilheiro", () => {
    const secas = [
      rodada("r", "2026-01-08T23:30:00Z", {
        presentes: [A, B],
        partidas: [partida("m", [A], 0, [B], 0)],
      }),
    ];

    const seco = retrospectiva(secas)!;
    expect(seco.artilheiros.playerIds).toEqual([]);
    expect(seco.golsPorPartida).toBe(0);
    expect(seco.jogoMaisMovimentado).toBeNull();
  });

  it("empate de gente demais no topo não vira destaque", () => {
    const empatadas = [
      rodada("r", "2026-01-08T23:30:00Z", {
        presentes: ["p1", "p2", "p3", "p4"],
        gols: { p1: 1, p2: 1, p3: 1, p4: 1 },
        partidas: [partida("m", ["p1", "p2"], 2, ["p3", "p4"], 2)],
      }),
    ];

    expect(retrospectiva(empatadas)!.artilheiros.playerIds).toEqual([]);
  });
});
