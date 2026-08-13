import { describe, expect, it } from "vitest";
import {
  conflitoDeNome,
  filtrarElenco,
  prepararJogador,
  type EntradaDeJogador,
  type JogadorConhecido,
} from "./roster";

function entrada(parcial: Partial<EntradaDeJogador> = {}): EntradaDeJogador {
  return {
    displayName: "Igor de Castro",
    nickname: null,
    skillLevel: 3,
    preferredRole: "MIDFIELDER",
    isGoalkeeper: false,
    aliases: [],
    ...parcial,
  };
}

const ELENCO: JogadorConhecido[] = [
  {
    id: "p1",
    displayName: "Igor de Castro",
    nickname: "Igão",
    aliases: ["Igao", "Igor"],
  },
  { id: "p2", displayName: "Marcos Manus", nickname: null, aliases: [] },
  { id: "p3", displayName: "Guilherme", nickname: null, aliases: [] },
];

describe("prepararJogador", () => {
  it("arruma a capitalização vinda da lista do WhatsApp", () => {
    const saida = prepararJogador(entrada({ displayName: "IGOR DE CASTRO" }));
    expect(saida.ok).toBe(true);
    if (saida.ok) expect(saida.valor.displayName).toBe("Igor de Castro");
  });

  it("recusa nome curto demais", () => {
    const saida = prepararJogador(entrada({ displayName: "I" }));
    expect(saida.ok).toBe(false);
    if (!saida.ok) expect(saida.erros[0].campo).toBe("displayName");
  });

  it("recusa nível fora de 1–5", () => {
    for (const nivel of [0, 6, -2, 99]) {
      const saida = prepararJogador(entrada({ skillLevel: nivel }));
      expect(saida.ok, `nível ${nivel}`).toBe(false);
    }
    for (const nivel of [1, 2, 3, 4, 5]) {
      expect(prepararJogador(entrada({ skillLevel: nivel })).ok, `nível ${nivel}`).toBe(true);
    }
  });

  it("posição de goleiro liga a flag de goleiro", () => {
    const saida = prepararJogador(
      entrada({ preferredRole: "GOALKEEPER", isGoalkeeper: false }),
    );
    expect(saida.ok).toBe(true);
    if (saida.ok) expect(saida.valor.isGoalkeeper).toBe(true);
  });

  it("descarta alias repetido e alias igual ao próprio nome", () => {
    const saida = prepararJogador(
      entrada({ aliases: ["Igão", "igao", "IGOR DE CASTRO", "Igor", "  "] }),
    );
    expect(saida.ok).toBe(true);
    if (saida.ok) expect(saida.valor.aliases).toEqual(["Igão", "Igor"]);
  });
});

describe("conflitoDeNome", () => {
  it("acusa colisão com nome, apelido e alias", () => {
    expect(conflitoDeNome("igor de castro", ELENCO)?.id).toBe("p1");
    expect(conflitoDeNome("Igão", ELENCO)?.id).toBe("p1");
    expect(conflitoDeNome("IGAO", ELENCO)?.id).toBe("p1");
  });

  it("não acusa quando o nome é novo", () => {
    expect(conflitoDeNome("Pedrão", ELENCO)).toBeNull();
  });

  it("deixa o jogador salvar o próprio nome na edição", () => {
    expect(conflitoDeNome("Igor de Castro", ELENCO, "p1")).toBeNull();
    expect(conflitoDeNome("Igor de Castro", ELENCO, "p2")?.id).toBe("p1");
  });
});

describe("filtrarElenco", () => {
  it("busca sem acento e sem caixa", () => {
    expect(filtrarElenco(ELENCO, "IGAO").map((j) => j.id)).toEqual(["p1"]);
    expect(filtrarElenco(ELENCO, "manus").map((j) => j.id)).toEqual(["p2"]);
  });

  it("busca por pedaço do nome", () => {
    expect(filtrarElenco(ELENCO, "gui").map((j) => j.id)).toEqual(["p3"]);
  });

  it("termo vazio devolve todo mundo", () => {
    expect(filtrarElenco(ELENCO, "   ")).toHaveLength(3);
  });
});
