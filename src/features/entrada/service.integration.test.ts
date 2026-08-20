import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/db/generated/client";
import { criarClientDeTeste, limparBanco, temBancoDeTeste } from "@/test/db";
import { criarCenario } from "@/test/fixtures";
import { resolverJogadorDaEntrada } from "./service";

const suite = temBancoDeTeste ? describe : describe.skip;

suite("link de convidado — camada de dados", () => {
  let db: PrismaClient;

  beforeEach(async () => {
    db ??= criarClientDeTeste();
    await limparBanco(db);
  });

  afterAll(async () => {
    await db?.$disconnect();
  });

  it("troca o link do grupo mais o nome escolhido pelo link pessoal do jogador", async () => {
    const cenario = await criarCenario(db);
    const grupo = await db.footballGroup.findUniqueOrThrow({
      where: { id: cenario.grupo.id },
    });
    const jogador = cenario.elenco[0];

    const resolucao = await resolverJogadorDaEntrada(db, {
      publicToken: grupo.publicToken,
      playerId: jogador.id,
    });

    expect(resolucao).toEqual({
      ok: true,
      groupId: grupo.id,
      selfToken: jogador.selfToken,
    });
  });

  it("recusa link de convidado que não existe", async () => {
    const cenario = await criarCenario(db);

    const resolucao = await resolverJogadorDaEntrada(db, {
      publicToken: "nao-existe",
      playerId: cenario.elenco[0].id,
    });

    expect(resolucao).toEqual({ ok: false, motivo: "link-invalido" });
  });

  it("recusa jogador de outro grupo — o link de um fut não escolhe do outro", async () => {
    const [meu, outro] = [await criarCenario(db), await criarCenario(db)];
    const grupo = await db.footballGroup.findUniqueOrThrow({
      where: { id: meu.grupo.id },
    });

    const resolucao = await resolverJogadorDaEntrada(db, {
      publicToken: grupo.publicToken,
      playerId: outro.elenco[0].id,
    });

    expect(resolucao).toEqual({ ok: false, motivo: "jogador-fora-do-elenco" });
  });

  it("recusa jogador inativo, pelo mesmo motivo que ele não aparece na lista", async () => {
    const cenario = await criarCenario(db);
    const grupo = await db.footballGroup.findUniqueOrThrow({
      where: { id: cenario.grupo.id },
    });
    await db.player.update({
      where: { id: cenario.elenco[0].id },
      data: { active: false },
    });

    const resolucao = await resolverJogadorDaEntrada(db, {
      publicToken: grupo.publicToken,
      playerId: cenario.elenco[0].id,
    });

    expect(resolucao).toEqual({ ok: false, motivo: "jogador-fora-do-elenco" });
  });

  it("jogador que não existe recebe a mesma recusa de jogador de outro grupo", async () => {
    const cenario = await criarCenario(db);
    const grupo = await db.footballGroup.findUniqueOrThrow({
      where: { id: cenario.grupo.id },
    });

    const resolucao = await resolverJogadorDaEntrada(db, {
      publicToken: grupo.publicToken,
      playerId: "cxxxxxxxxxxxxxxxxxxxxxxxx",
    });

    expect(resolucao).toEqual({ ok: false, motivo: "jogador-fora-do-elenco" });
  });

  it("o link do grupo nasce imprevisível — UUID, não cuid em sequência", async () => {
    const [a, b] = [await criarCenario(db), await criarCenario(db)];

    const grupos = await db.footballGroup.findMany({
      where: { id: { in: [a.grupo.id, b.grupo.id] } },
      select: { publicToken: true },
    });

    for (const grupo of grupos) {
      expect(grupo.publicToken).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    }
    expect(grupos[0].publicToken).not.toBe(grupos[1].publicToken);
  });
});
