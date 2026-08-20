import { describe, expect, it } from "vitest";
import {
  golRecenteDoMesmoTime,
  JANELA_DE_GOL_REPETIDO_MS,
  type LanceRegistrado,
} from "./gol-repetido";

const AGORA = 1_700_000_000_000;

function lance(
  id: string,
  teamId: string,
  segundosAtras: number,
  extras: Partial<LanceRegistrado> = {},
): LanceRegistrado {
  return {
    id,
    teamId,
    registradoEm: AGORA - segundosAtras * 1000,
    ...extras,
  };
}

describe("golRecenteDoMesmoTime", () => {
  it("não vê repetição quando não houve gol nenhum", () => {
    expect(golRecenteDoMesmoTime([], "amarelo", AGORA)).toBeNull();
  });

  it("aponta o gol do mesmo time que entrou há poucos segundos", () => {
    const lances = [lance("g1", "amarelo", 8, { autor: "Salles" })];

    const repetido = golRecenteDoMesmoTime(lances, "amarelo", AGORA);

    expect(repetido).toEqual({ id: "g1", autor: "Salles", segundos: 8 });
  });

  it("ignora gol do outro time — os dois times marcando é jogo, não erro", () => {
    const lances = [lance("g1", "verde", 3)];

    expect(golRecenteDoMesmoTime(lances, "amarelo", AGORA)).toBeNull();
  });

  it("ignora gol antigo: passada a janela, o segundo gol é gol mesmo", () => {
    const lances = [lance("g1", "amarelo", JANELA_DE_GOL_REPETIDO_MS / 1000 + 1)];

    expect(golRecenteDoMesmoTime(lances, "amarelo", AGORA)).toBeNull();
  });

  it("ignora lance desfeito — quem desfez já disse que não foi gol", () => {
    const lances = [lance("g1", "amarelo", 5, { desfeito: true })];

    expect(golRecenteDoMesmoTime(lances, "amarelo", AGORA)).toBeNull();
  });

  it("escolhe o mais recente quando há vários dentro da janela", () => {
    const lances = [
      lance("antigo", "amarelo", 15, { autor: "Salles" }),
      lance("novo", "amarelo", 2, { autor: "Marcos" }),
    ];

    expect(golRecenteDoMesmoTime(lances, "amarelo", AGORA)?.id).toBe("novo");
  });

  it("gol sem autor definido não vira `undefined` na tela", () => {
    const lances = [lance("g1", "amarelo", 4)];

    expect(golRecenteDoMesmoTime(lances, "amarelo", AGORA)?.autor).toBeNull();
  });

  it("tolera lance com carimbo no futuro — desvio de relógio é o normal", () => {
    // Latência e arredondamento produzem diferença negativa o tempo todo; se
    // isso zerasse a checagem, ela sumiria em silêncio justo no aparelho torto.
    const lances = [lance("g1", "amarelo", -3)];

    expect(golRecenteDoMesmoTime(lances, "amarelo", AGORA)).toEqual({
      id: "g1",
      autor: null,
      segundos: 0,
    });
  });

  it("carimbo muito à frente da janela não é considerado", () => {
    const lances = [lance("g1", "amarelo", -(JANELA_DE_GOL_REPETIDO_MS / 1000 + 1))];

    expect(golRecenteDoMesmoTime(lances, "amarelo", AGORA)).toBeNull();
  });

  it("aceita janela por parâmetro — a regra é um número, não um dogma", () => {
    const lances = [lance("g1", "amarelo", 30)];

    expect(golRecenteDoMesmoTime(lances, "amarelo", AGORA)).toBeNull();
    expect(golRecenteDoMesmoTime(lances, "amarelo", AGORA, 60_000)?.id).toBe("g1");
  });
});
