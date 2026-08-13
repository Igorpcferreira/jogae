import { describe, expect, it } from "vitest";
import { can, permissionsOf, type Permission, type Role } from "./permissions";

const TODAS: Permission[] = [
  "grupo:editar",
  "grupo:excluir",
  "membros:gerenciar",
  "elenco:editar",
  "rodada:criar",
  "rodada:presenca",
  "rodada:sortear",
  "partida:gerenciar",
  "rodada:encerrar",
];

describe("permissões por papel", () => {
  it("dono pode tudo", () => {
    for (const permissao of TODAS) {
      expect(can("OWNER", permissao), permissao).toBe(true);
    }
  });

  it("organizador cuida do fut mas não mexe em membros nem exclui o grupo", () => {
    expect(can("ADMIN", "rodada:sortear")).toBe(true);
    expect(can("ADMIN", "elenco:editar")).toBe(true);
    expect(can("ADMIN", "grupo:editar")).toBe(true);
    expect(can("ADMIN", "membros:gerenciar")).toBe(false);
    expect(can("ADMIN", "grupo:excluir")).toBe(false);
  });

  it("assistente só apita o jogo — nunca config nem sorteio", () => {
    expect(can("ASSISTANT", "partida:gerenciar")).toBe(true);
    expect(can("ASSISTANT", "rodada:encerrar")).toBe(true);

    expect(can("ASSISTANT", "grupo:editar")).toBe(false);
    expect(can("ASSISTANT", "rodada:sortear")).toBe(false);
    expect(can("ASSISTANT", "rodada:presenca")).toBe(false);
    expect(can("ASSISTANT", "rodada:criar")).toBe(false);
    expect(can("ASSISTANT", "elenco:editar")).toBe(false);
  });

  it("visitante sem vínculo não pode nada", () => {
    for (const permissao of TODAS) {
      expect(can(null, permissao), permissao).toBe(false);
      expect(can(undefined, permissao), permissao).toBe(false);
    }
    expect(permissionsOf(null)).toHaveLength(0);
  });

  it("papel mais forte contém as permissões do mais fraco", () => {
    const assistente = permissionsOf("ASSISTANT");
    const organizador = permissionsOf("ADMIN");
    const dono = permissionsOf("OWNER");

    for (const permissao of assistente) expect(organizador).toContain(permissao);
    for (const permissao of organizador) expect(dono).toContain(permissao);
    expect(dono).toHaveLength(TODAS.length);
  });

  it("toda permissão declarada é alcançável por algum papel", () => {
    const papeis: Role[] = ["OWNER", "ADMIN", "ASSISTANT"];
    for (const permissao of TODAS) {
      expect(papeis.some((papel) => can(papel, permissao)), permissao).toBe(true);
    }
  });
});
