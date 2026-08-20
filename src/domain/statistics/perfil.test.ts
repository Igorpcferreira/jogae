import { describe, expect, it } from "vitest";
import { partida, rodada } from "./historico.fixture";
import { resumoDoJogador } from "./perfil";

const A = "salles";
const B = "marcos";

const historico = [
  rodada("r1", "2026-01-08T23:30:00Z", {
    presentes: [A, B],
    gols: { [A]: 2 },
    assistencias: { [A]: 1, [B]: 1 },
    mvpPlayerId: A,
    escolhaDaGaleraIds: [B],
    votosDaEscolha: 5,
    partidas: [
      partida("m1", [A], 2, [B], 1),
      partida("m2", [A], 0, [B], 3),
    ],
  }),
  // Confirmou, mas ficou de fora do sorteio: presença sem partida.
  rodada("r2", "2026-01-15T23:30:00Z", {
    presentes: [A, B],
    partidas: [partida("m3", [B], 1, ["outro"], 1)],
  }),
];

describe("resumoDoJogador", () => {
  const resumo = resumoDoJogador(historico, A);

  it("separa rodada (presença) de partida (jogo)", () => {
    expect(resumo.rodadas).toBe(2);
    expect(resumo.partidas).toBe(2);
  });

  it("soma gols, assistências e participações", () => {
    expect(resumo.gols).toBe(2);
    expect(resumo.assistencias).toBe(1);
    expect(resumo.participacoes).toBe(3);
  });

  it("conta vitória, empate e derrota pelas partidas", () => {
    expect(resumo.vitorias).toBe(1);
    expect(resumo.derrotas).toBe(1);
    expect(resumo.empates).toBe(0);
    expect(resumo.aproveitamento).toBeCloseTo(0.5);
  });

  it("guarda a primeira e a última rodada", () => {
    expect(resumo.primeiraRodada?.toISOString()).toBe("2026-01-08T23:30:00.000Z");
    expect(resumo.ultimaRodada?.toISOString()).toBe("2026-01-15T23:30:00.000Z");
  });

  it("conta craque calculado e escolha da galera separados", () => {
    expect(resumo.vezesCraque).toBe(1);
    expect(resumo.vezesEscolhaDaGalera).toBe(0);
    expect(resumoDoJogador(historico, B).vezesEscolhaDaGalera).toBe(1);
  });

  it("gols por rodada com uma casa", () => {
    expect(resumo.golsPorRodada).toBe(1);
  });

  it("quem nunca apareceu tem resumo zerado, sem divisão por zero", () => {
    const vazio = resumoDoJogador(historico, "fantasma");
    expect(vazio.rodadas).toBe(0);
    expect(vazio.aproveitamento).toBe(0);
    expect(vazio.golsPorRodada).toBe(0);
    expect(vazio.primeiraRodada).toBeNull();
  });

  it("não expõe nível técnico — o card é a tela mais compartilhável do app", () => {
    expect(Object.keys(resumo)).not.toContain("skillLevel");
  });
});
