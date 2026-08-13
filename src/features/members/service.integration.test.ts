import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/db/generated/client";
import { can } from "@/domain/access/permissions";
import { criarClientDeTeste, limparBanco, temBancoDeTeste } from "@/test/db";
import { criarCenario } from "@/test/fixtures";
import {
  aceitarConvitesPendentes,
  convidar,
  listarConvites,
  listarMembros,
  removerMembro,
  revogarConvite,
  trocarPapel,
} from "./service";

const suite = temBancoDeTeste ? describe : describe.skip;

suite("membros — camada de dados", () => {
  let db: PrismaClient;

  beforeEach(async () => {
    db ??= criarClientDeTeste();
    await limparBanco(db);
  });

  afterAll(async () => {
    await db?.$disconnect();
  });

  describe("convite", () => {
    it("registra o convite com e-mail normalizado", async () => {
      const { grupo } = await criarCenario(db);

      const resultado = await convidar(db, {
        groupId: grupo.id,
        email: "Assistente@Exemplo.com",
        role: "ASSISTANT",
      });

      expect(resultado.ok).toBe(true);
      if (!resultado.ok) return;
      // Normalizado: o convite tem que casar com o e-mail que vier do provedor.
      expect(resultado.email).toBe("assistente@exemplo.com");

      const salvo = await db.invite.findFirstOrThrow({ where: { groupId: grupo.id } });
      expect(salvo.email).toBe("assistente@exemplo.com");
      expect(salvo.role).toBe("ASSISTANT");
      expect(salvo.consumedAt).toBeNull();
    });

    it("recusa convite pra quem já está no grupo", async () => {
      const { grupo, usuario } = await criarCenario(db);

      const resultado = await convidar(db, {
        groupId: grupo.id,
        email: usuario.email,
        role: "ADMIN",
      });

      expect(resultado.ok).toBe(false);
    });

    it("recusa segundo convite aberto pro mesmo e-mail", async () => {
      const { grupo } = await criarCenario(db);
      await convidar(db, { groupId: grupo.id, email: "a@b.com", role: "ADMIN" });

      const segundo = await convidar(db, {
        groupId: grupo.id,
        email: "a@b.com",
        role: "ADMIN",
      });
      expect(segundo.ok).toBe(false);
    });

    it("não lista convite já consumido nem vencido", async () => {
      const { grupo } = await criarCenario(db);

      await convidar(db, { groupId: grupo.id, email: "usado@b.com", role: "ADMIN" });
      await db.invite.updateMany({
        where: { email: "usado@b.com" },
        data: { consumedAt: new Date() },
      });

      await convidar(db, { groupId: grupo.id, email: "vencido@b.com", role: "ADMIN" });
      await db.invite.updateMany({
        where: { email: "vencido@b.com" },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await convidar(db, { groupId: grupo.id, email: "aberto@b.com", role: "ADMIN" });

      const abertos = await listarConvites(db, grupo.id);
      expect(abertos.map((convite) => convite.email)).toEqual(["aberto@b.com"]);
    });

    it("revogar só apaga convite do próprio grupo", async () => {
      const { grupo } = await criarCenario(db);
      const outro = await criarCenario(db);

      await convidar(db, { groupId: grupo.id, email: "a@b.com", role: "ADMIN" });
      const alvo = (await listarConvites(db, grupo.id))[0];

      await revogarConvite(db, outro.grupo.id, alvo.id);
      expect(await listarConvites(db, grupo.id)).toHaveLength(1);

      await revogarConvite(db, grupo.id, alvo.id);
      expect(await listarConvites(db, grupo.id)).toHaveLength(0);
    });
  });

  describe("aceitar convite ao entrar", () => {
    it("cria o vínculo no papel combinado e fecha o convite", async () => {
      const { grupo } = await criarCenario(db);
      await convidar(db, {
        groupId: grupo.id,
        email: "assistente@teste.local",
        role: "ASSISTANT",
      });

      const convidado = await db.user.create({
        data: { name: "Assistente", email: "assistente@teste.local" },
      });

      const resultado = await aceitarConvitesPendentes(db, {
        userId: convidado.id,
        email: "assistente@teste.local",
      });

      expect(resultado).toMatchObject({ aceitos: 1, slug: grupo.slug });
      const vinculo = await db.membership.findUniqueOrThrow({
        where: { userId_groupId: { userId: convidado.id, groupId: grupo.id } },
      });
      expect(vinculo.role).toBe("ASSISTANT");
      expect(await listarConvites(db, grupo.id)).toHaveLength(0);
    });

    it("casa o e-mail sem depender de caixa alta", async () => {
      const { grupo } = await criarCenario(db);
      await convidar(db, { groupId: grupo.id, email: "Maiuscula@B.com", role: "ADMIN" });

      const convidado = await db.user.create({
        data: { name: "Convidado", email: "maiuscula@b.com" },
      });

      expect(
        (
          await aceitarConvitesPendentes(db, {
            userId: convidado.id,
            email: "MAIUSCULA@B.COM",
          })
        ).aceitos,
      ).toBe(1);
    });

    it("aceita convites de vários grupos de uma vez", async () => {
      const a = await criarCenario(db);
      const b = await criarCenario(db);
      await convidar(db, { groupId: a.grupo.id, email: "multi@b.com", role: "ADMIN" });
      await convidar(db, { groupId: b.grupo.id, email: "multi@b.com", role: "ASSISTANT" });

      const convidado = await db.user.create({
        data: { name: "Multi", email: "multi@b.com" },
      });

      expect(
        (await aceitarConvitesPendentes(db, { userId: convidado.id, email: "multi@b.com" }))
          .aceitos,
      ).toBe(2);
      expect(await db.membership.count({ where: { userId: convidado.id } })).toBe(2);
    });

    it("ignora convite vencido", async () => {
      const { grupo } = await criarCenario(db);
      await convidar(db, { groupId: grupo.id, email: "tarde@b.com", role: "ADMIN" });
      await db.invite.updateMany({
        where: { email: "tarde@b.com" },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const convidado = await db.user.create({
        data: { name: "Atrasado", email: "tarde@b.com" },
      });

      expect(
        (await aceitarConvitesPendentes(db, { userId: convidado.id, email: "tarde@b.com" }))
          .aceitos,
      ).toBe(0);
      expect(await db.membership.count({ where: { userId: convidado.id } })).toBe(0);
    });

    it("não rebaixa quem já é membro com papel mais forte", async () => {
      const { grupo, usuario } = await criarCenario(db);
      // Convite emitido antes de a pessoa virar dona do grupo.
      await db.invite.create({
        data: {
          email: usuario.email,
          groupId: grupo.id,
          role: "ASSISTANT",
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      });

      await aceitarConvitesPendentes(db, { userId: usuario.id, email: usuario.email });

      const vinculo = await db.membership.findUniqueOrThrow({
        where: { userId_groupId: { userId: usuario.id, groupId: grupo.id } },
      });
      expect(vinculo.role).toBe("OWNER");
    });

    it("quem entra sem convite não vira membro de nada", async () => {
      await criarCenario(db);
      const estranho = await db.user.create({
        data: { name: "Estranho", email: "estranho@b.com" },
      });

      expect(
        await aceitarConvitesPendentes(db, {
          userId: estranho.id,
          email: "estranho@b.com",
        }),
      ).toEqual({ aceitos: 0, slug: null });
      expect(await db.membership.count({ where: { userId: estranho.id } })).toBe(0);
    });
  });

  describe("papel e remoção", () => {
    async function comAssistente(grupoId: string) {
      const usuario = await db.user.create({
        data: { name: "Ajudante", email: `${grupoId.slice(0, 8)}-ajuda@teste.local` },
      });
      await db.membership.create({
        data: { userId: usuario.id, groupId: grupoId, role: "ASSISTANT" },
      });
      return usuario;
    }

    it("promove assistente a organizador", async () => {
      const { grupo } = await criarCenario(db);
      const ajudante = await comAssistente(grupo.id);

      expect(
        await trocarPapel(db, {
          groupId: grupo.id,
          userId: ajudante.id,
          novoPapel: "ADMIN",
        }),
      ).toEqual({ ok: true });

      const membros = await listarMembros(db, grupo.id);
      expect(membros.find((m) => m.userId === ajudante.id)?.role).toBe("ADMIN");
    });

    it("assistente não sorteia nem edita config — só apita o jogo", async () => {
      const { grupo } = await criarCenario(db);
      const ajudante = await comAssistente(grupo.id);

      const vinculo = await db.membership.findUniqueOrThrow({
        where: { userId_groupId: { userId: ajudante.id, groupId: grupo.id } },
      });

      expect(can(vinculo.role, "rodada:sortear")).toBe(false);
      expect(can(vinculo.role, "grupo:editar")).toBe(false);
      expect(can(vinculo.role, "elenco:editar")).toBe(false);
      expect(can(vinculo.role, "membros:gerenciar")).toBe(false);
      expect(can(vinculo.role, "partida:gerenciar")).toBe(true);
      expect(can(vinculo.role, "rodada:encerrar")).toBe(true);
    });

    it("não rebaixa o último dono", async () => {
      const { grupo, usuario } = await criarCenario(db);

      const veredito = await trocarPapel(db, {
        groupId: grupo.id,
        userId: usuario.id,
        novoPapel: "ADMIN",
      });

      expect(veredito.ok).toBe(false);
      const membros = await listarMembros(db, grupo.id);
      expect(membros[0].role).toBe("OWNER");
    });

    it("rebaixa o dono depois que outro dono assume", async () => {
      const { grupo, usuario } = await criarCenario(db);
      const ajudante = await comAssistente(grupo.id);

      await trocarPapel(db, {
        groupId: grupo.id,
        userId: ajudante.id,
        novoPapel: "OWNER",
      });
      expect(
        await trocarPapel(db, {
          groupId: grupo.id,
          userId: usuario.id,
          novoPapel: "ADMIN",
        }),
      ).toEqual({ ok: true });
    });

    it("não remove o último dono", async () => {
      const { grupo, usuario } = await criarCenario(db);

      const veredito = await removerMembro(db, { groupId: grupo.id, userId: usuario.id });

      expect(veredito.ok).toBe(false);
      expect(await listarMembros(db, grupo.id)).toHaveLength(1);
    });

    it("remove assistente e o grupo segue de pé", async () => {
      const { grupo } = await criarCenario(db);
      const ajudante = await comAssistente(grupo.id);

      expect(
        await removerMembro(db, { groupId: grupo.id, userId: ajudante.id }),
      ).toEqual({ ok: true });
      expect(await listarMembros(db, grupo.id)).toHaveLength(1);
    });

    it("recusa mexer em quem não é do grupo", async () => {
      const { grupo } = await criarCenario(db);
      const outro = await criarCenario(db);

      expect(
        (await trocarPapel(db, {
          groupId: grupo.id,
          userId: outro.usuario.id,
          novoPapel: "ADMIN",
        })).ok,
      ).toBe(false);
      expect(
        (await removerMembro(db, { groupId: grupo.id, userId: outro.usuario.id })).ok,
      ).toBe(false);
    });
  });
});
