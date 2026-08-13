import { describe, expect, it } from "vitest";
import {
  candidatosDeSlug,
  capacidadeDoFormato,
  gerarSlug,
  nomeDeGrupoValido,
  normalizarFormato,
  PADRAO_POR_MODALIDADE,
  slugDisponivel,
} from "./setup";

describe("slug do grupo", () => {
  it("transforma nome em slug legível", () => {
    expect(gerarSlug("Fut da Quinta")).toBe("fut-da-quinta");
    expect(gerarSlug("Pelada do Zé ⚽")).toBe("pelada-do-ze");
    expect(gerarSlug("  Fut   da   Quinta  ")).toBe("fut-da-quinta");
    expect(gerarSlug("Racha 10/10")).toBe("racha-10-10");
  });

  it("nunca devolve slug vazio", () => {
    expect(gerarSlug("⚽⚽⚽")).toBe("fut");
    expect(gerarSlug("")).toBe("fut");
    expect(gerarSlug("---")).toBe("fut");
  });

  it("usa o slug limpo quando está livre", () => {
    expect(slugDisponivel("Fut da Quinta", [])).toBe("fut-da-quinta");
  });

  it("numera a partir do 2 quando o nome já existe", () => {
    expect(slugDisponivel("Fut da Quinta", ["fut-da-quinta"])).toBe("fut-da-quinta-2");
    expect(slugDisponivel("Fut da Quinta", ["fut-da-quinta", "fut-da-quinta-2"])).toBe(
      "fut-da-quinta-3",
    );
  });

  it("não deixa grupo ocupar rota da aplicação", () => {
    expect(slugDisponivel("Novo", [])).toBe("novo-2");
    expect(slugDisponivel("Entrar", [])).toBe("entrar-2");
  });

  it("gera candidatos na ordem em que serão tentados", () => {
    const candidatos = candidatosDeSlug("Fut da Quinta", 3);
    expect(candidatos).toEqual(["fut-da-quinta", "fut-da-quinta-2", "fut-da-quinta-3"]);
  });
});

describe("formato do fut", () => {
  it("calcula a capacidade a partir do formato", () => {
    expect(
      capacidadeDoFormato({
        teamCount: 4,
        fieldPlayersPerTeam: 4,
        goalkeepersPerTeam: 1,
      }),
    ).toBe(20);
  });

  it("society de 4 times cabe 28 jogadores", () => {
    expect(capacidadeDoFormato(PADRAO_POR_MODALIDADE.SOCIETY)).toBe(28);
  });

  it("revezamento zera a vaga de goleiro", () => {
    const formato = normalizarFormato({
      ...PADRAO_POR_MODALIDADE.SOCIETY,
      goalkeeperMode: "ROTATING",
    });
    expect(formato.goalkeepersPerTeam).toBe(0);
    expect(capacidadeDoFormato(formato)).toBe(24);
  });

  it("prende valores absurdos dentro dos limites", () => {
    const formato = normalizarFormato({
      teamCount: 99,
      fieldPlayersPerTeam: 0,
      goalkeepersPerTeam: 7,
      goalkeeperMode: "FIXED_PER_TEAM",
      defaultDurationMin: 9999,
    });
    expect(formato.teamCount).toBe(8);
    expect(formato.fieldPlayersPerTeam).toBe(2);
    expect(formato.goalkeepersPerTeam).toBe(2);
    expect(formato.defaultDurationMin).toBe(240);
  });
});

describe("nome do grupo", () => {
  it("recusa nome curto demais ou longo demais", () => {
    expect(nomeDeGrupoValido("A")).toBe(false);
    expect(nomeDeGrupoValido("  ")).toBe(false);
    expect(nomeDeGrupoValido("x".repeat(61))).toBe(false);
    expect(nomeDeGrupoValido("Fut da Quinta")).toBe(true);
  });
});
