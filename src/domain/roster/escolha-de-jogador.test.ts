import { describe, expect, it } from "vitest";
import { opcoesDeEscolha, type JogadorParaEscolha } from "./escolha-de-jogador";

function jogador(
  id: string,
  displayName: string,
  extras: Partial<JogadorParaEscolha> = {},
): JogadorParaEscolha {
  return { id, displayName, nickname: null, active: true, ...extras };
}

describe("opcoesDeEscolha", () => {
  it("mostra o apelido, que é como o grupo chama a pessoa", () => {
    const lista = opcoesDeEscolha([
      jogador("1", "Rafael Souza", { nickname: "Rafa" }),
    ]);

    expect(lista).toEqual([{ id: "1", nome: "Rafa" }]);
  });

  it("cai no nome completo quando não tem apelido", () => {
    expect(opcoesDeEscolha([jogador("1", "Marcos Manus")])).toEqual([
      { id: "1", nome: "Marcos Manus" },
    ]);
  });

  it("deixa o jogador inativo de fora", () => {
    const lista = opcoesDeEscolha([
      jogador("1", "Marcos Manus"),
      jogador("2", "Quem Saiu", { active: false }),
    ]);

    expect(lista.map((opcao) => opcao.id)).toEqual(["1"]);
  });

  it("ordena por nome ignorando acento", () => {
    const lista = opcoesDeEscolha([
      jogador("1", "Bruno"),
      jogador("2", "Ávila"),
      jogador("3", "Caio"),
    ]);

    expect(lista.map((opcao) => opcao.nome)).toEqual(["Ávila", "Bruno", "Caio"]);
  });

  it("desambigua apelido repetido: tocar no nome errado é responder pelo outro", () => {
    const lista = opcoesDeEscolha([
      jogador("1", "Rafael Souza", { nickname: "Rafa" }),
      jogador("2", "Rafael Lima", { nickname: "Rafa" }),
    ]);

    expect(lista.map((opcao) => opcao.nome)).toEqual(["Rafael Lima", "Rafael Souza"]);
  });

  it("desambigua também quando o apelido de um bate com o nome de outro", () => {
    const lista = opcoesDeEscolha([
      jogador("1", "Pedro Alves", { nickname: "Léo" }),
      jogador("2", "Léo"),
    ]);

    expect(lista.map((opcao) => opcao.nome).sort()).toEqual(["Léo", "Pedro Alves"]);
  });

  it("não desambigua quem não precisa: só o par repetido volta pro nome completo", () => {
    const lista = opcoesDeEscolha([
      jogador("1", "Rafael Souza", { nickname: "Rafa" }),
      jogador("2", "Rafael Lima", { nickname: "Rafa" }),
      jogador("3", "Marcos Manus", { nickname: "Marcão" }),
    ]);

    expect(lista.find((opcao) => opcao.id === "3")?.nome).toBe("Marcão");
  });

  it("inativo não conta pro conflito — quem saiu não disputa o apelido", () => {
    const lista = opcoesDeEscolha([
      jogador("1", "Rafael Souza", { nickname: "Rafa" }),
      jogador("2", "Rafael Lima", { nickname: "Rafa", active: false }),
    ]);

    expect(lista).toEqual([{ id: "1", nome: "Rafa" }]);
  });

  it("não vaza nada além de id e nome (plano §13)", () => {
    const lista = opcoesDeEscolha([
      jogador("1", "Marcos Manus", { nickname: "Marcão" }),
    ]);

    expect(Object.keys(lista[0]).sort()).toEqual(["id", "nome"]);
  });

  it("elenco vazio devolve lista vazia, sem estourar", () => {
    expect(opcoesDeEscolha([])).toEqual([]);
  });
});
