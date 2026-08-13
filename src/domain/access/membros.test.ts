import { describe, expect, it } from "vitest";
import { podeConvidar, podeRemoverMembro, podeTrocarPapel } from "./membros";

describe("troca de papel", () => {
  it("promove assistente a organizador", () => {
    expect(
      podeTrocarPapel({ papelAtual: "ASSISTANT", novoPapel: "ADMIN", donos: 1 }),
    ).toEqual({ ok: true });
  });

  it("recusa trocar pelo papel que já é", () => {
    const veredito = podeTrocarPapel({
      papelAtual: "ADMIN",
      novoPapel: "ADMIN",
      donos: 1,
    });
    expect(veredito.ok).toBe(false);
  });

  it("não rebaixa o último dono", () => {
    const veredito = podeTrocarPapel({
      papelAtual: "OWNER",
      novoPapel: "ADMIN",
      donos: 1,
    });
    expect(veredito).toMatchObject({ ok: false });
    if (!veredito.ok) expect(veredito.motivo).toMatch(/pelo menos um dono/i);
  });

  it("rebaixa um dono quando existe outro", () => {
    expect(
      podeTrocarPapel({ papelAtual: "OWNER", novoPapel: "ADMIN", donos: 2 }),
    ).toEqual({ ok: true });
  });

  it("promover alguém a dono nunca deixa o grupo órfão", () => {
    expect(
      podeTrocarPapel({ papelAtual: "ADMIN", novoPapel: "OWNER", donos: 1 }),
    ).toEqual({ ok: true });
  });
});

describe("remoção de membro", () => {
  it("remove organizador sem cerimônia", () => {
    expect(podeRemoverMembro({ papelAtual: "ADMIN", donos: 1 })).toEqual({ ok: true });
  });

  it("não remove o último dono", () => {
    expect(podeRemoverMembro({ papelAtual: "OWNER", donos: 1 }).ok).toBe(false);
  });

  it("remove um dono quando sobra outro", () => {
    expect(podeRemoverMembro({ papelAtual: "OWNER", donos: 2 })).toEqual({ ok: true });
  });
});

describe("convite", () => {
  it("aceita papel conhecido para quem está de fora", () => {
    expect(
      podeConvidar({ papel: "ASSISTANT", jaEhMembro: false, jaConvidado: false }),
    ).toEqual({ ok: true });
  });

  it("recusa quem já é membro", () => {
    expect(
      podeConvidar({ papel: "ADMIN", jaEhMembro: true, jaConvidado: false }).ok,
    ).toBe(false);
  });

  it("recusa convite duplicado", () => {
    expect(
      podeConvidar({ papel: "ADMIN", jaEhMembro: false, jaConvidado: true }).ok,
    ).toBe(false);
  });

  it("recusa papel inventado", () => {
    expect(
      podeConvidar({
        papel: "SUPREMO" as never,
        jaEhMembro: false,
        jaConvidado: false,
      }).ok,
    ).toBe(false);
  });
});
