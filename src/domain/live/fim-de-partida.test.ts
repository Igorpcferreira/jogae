import { describe, expect, it } from "vitest";
import {
  descreverRegras,
  lerRegrasDePartida,
  SEM_REGRAS,
  situacaoDaPartida,
} from "./fim-de-partida";

const REGRAS = { limiteGols: 2, limiteMinutos: 8 };

describe("lerRegrasDePartida", () => {
  it("lê as regras do settings do grupo", () => {
    expect(lerRegrasDePartida({ partida: { limiteGols: 2, limiteMinutos: 8 } })).toEqual(
      REGRAS,
    );
  });

  it("settings vazio, nulo ou sem a chave vira sem limite", () => {
    expect(lerRegrasDePartida(null)).toEqual(SEM_REGRAS);
    expect(lerRegrasDePartida({})).toEqual(SEM_REGRAS);
    expect(lerRegrasDePartida({ matchRule: "texto livre" })).toEqual(SEM_REGRAS);
  });

  it("valor torto não quebra: zero, negativo, fração, texto e estouro viram nulo", () => {
    expect(lerRegrasDePartida({ partida: { limiteGols: 0, limiteMinutos: -5 } })).toEqual(
      SEM_REGRAS,
    );
    expect(
      lerRegrasDePartida({ partida: { limiteGols: 1.5, limiteMinutos: "8" } }),
    ).toEqual(SEM_REGRAS);
    expect(
      lerRegrasDePartida({ partida: { limiteGols: 999, limiteMinutos: 999 } }),
    ).toEqual(SEM_REGRAS);
  });
});

describe("situacaoDaPartida", () => {
  it("sem regra configurada, a partida nunca 'acaba' sozinha", () => {
    const situacao = situacaoDaPartida({
      golsA: 9,
      golsB: 0,
      decorridoSeg: 99_999,
      regras: SEM_REGRAS,
    });
    expect(situacao.fim).toBe(false);
    expect(situacao.restanteSeg).toBeNull();
  });

  it("um time chegando no limite de gols encerra — o placar somado não", () => {
    // 1×1 soma 2, mas ninguém fez os 2 gols da regra.
    expect(
      situacaoDaPartida({ golsA: 1, golsB: 1, decorridoSeg: 60, regras: REGRAS }).fim,
    ).toBe(false);
    const fim = situacaoDaPartida({ golsA: 2, golsB: 1, decorridoSeg: 60, regras: REGRAS });
    expect(fim.fim).toBe(true);
    expect(fim.motivo).toBe("gols");
  });

  it("tempo esgotado encerra e o restante trava em zero", () => {
    const antes = situacaoDaPartida({
      golsA: 0,
      golsB: 0,
      decorridoSeg: 7 * 60,
      regras: REGRAS,
    });
    expect(antes.fim).toBe(false);
    expect(antes.restanteSeg).toBe(60);

    const fim = situacaoDaPartida({
      golsA: 0,
      golsB: 0,
      decorridoSeg: 8 * 60 + 30,
      regras: REGRAS,
    });
    expect(fim.fim).toBe(true);
    expect(fim.motivo).toBe("tempo");
    expect(fim.restanteSeg).toBe(0);
  });

  it("com gols e tempo batidos ao mesmo tempo, o motivo é gols", () => {
    const situacao = situacaoDaPartida({
      golsA: 2,
      golsB: 0,
      decorridoSeg: 10 * 60,
      regras: REGRAS,
    });
    expect(situacao.motivo).toBe("gols");
  });

  it("relógio torto (decorrido negativo) não conta como tempo esgotado", () => {
    const situacao = situacaoDaPartida({
      golsA: 0,
      golsB: 0,
      decorridoSeg: -30,
      regras: REGRAS,
    });
    expect(situacao.fim).toBe(false);
    expect(situacao.restanteSeg).toBe(8 * 60);
  });
});

describe("descreverRegras", () => {
  it("monta a frase com os limites que existem", () => {
    expect(descreverRegras(REGRAS)).toBe("Partida vai até 2 gols ou 8 minutos.");
    expect(descreverRegras({ limiteGols: 2, limiteMinutos: null })).toBe(
      "Partida vai até 2 gols.",
    );
    expect(descreverRegras({ limiteGols: null, limiteMinutos: 10 })).toBe(
      "Partida vai até 10 minutos.",
    );
    expect(descreverRegras({ limiteGols: 1, limiteMinutos: 1 })).toBe(
      "Partida vai até 1 gol ou 1 minuto.",
    );
  });

  it("sem regra, sem frase", () => {
    expect(descreverRegras(SEM_REGRAS)).toBeNull();
  });
});
