import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/db/generated/client";
import { criarClientDeTeste, limparBanco, temBancoDeTeste } from "@/test/db";
import { criarCenario } from "@/test/fixtures";
import { HORAS_DE_VOTACAO } from "@/domain/mvp/votacao";
import { registrarVoto, situacaoDaVotacao } from "./service";

const suite = temBancoDeTeste ? describe : describe.skip;

suite("votação de craque — camada de dados", () => {
  let db: PrismaClient;

  beforeEach(async () => {
    db ??= criarClientDeTeste();
    await limparBanco(db);
  });

  afterAll(async () => {
    await db?.$disconnect();
  });

  /** Rodada encerrada agora, com o elenco todo confirmado. */
  async function comRodadaEncerrada() {
    const cenario = await criarCenario(db, { jogadores: 8, goleiros: 2 });
    const apito = new Date();

    await db.attendance.deleteMany({ where: { roundId: cenario.rodada.id } });
    await db.attendance.createMany({
      data: cenario.elenco.map((jogador, ordem) => ({
        roundId: cenario.rodada.id,
        playerId: jogador.id,
        status: "CONFIRMED" as const,
        order: ordem,
      })),
    });

    await db.round.update({
      where: { id: cenario.rodada.id },
      data: { status: "FINISHED", finishedAt: apito },
    });

    return { ...cenario, apito };
  }

  it("grava o voto de quem jogou", async () => {
    const cenario = await comRodadaEncerrada();

    const resultado = await registrarVoto(db, {
      roundId: cenario.rodada.id,
      groupId: cenario.grupo.id,
      voterPlayerId: cenario.elenco[0].id,
      votedPlayerId: cenario.elenco[1].id,
    });

    expect(resultado).toEqual({ ok: true, votou: cenario.elenco[1].id });
    expect(await db.mvpVote.count({ where: { roundId: cenario.rodada.id } })).toBe(1);
  });

  it("recusa o segundo voto da mesma pessoa", async () => {
    const cenario = await comRodadaEncerrada();
    const voto = {
      roundId: cenario.rodada.id,
      groupId: cenario.grupo.id,
      voterPlayerId: cenario.elenco[0].id,
    };

    await registrarVoto(db, { ...voto, votedPlayerId: cenario.elenco[1].id });
    const segundo = await registrarVoto(db, {
      ...voto,
      votedPlayerId: cenario.elenco[2].id,
    });

    expect(segundo).toEqual({ ok: false, motivo: "ja-votou" });
    expect(await db.mvpVote.count({ where: { roundId: cenario.rodada.id } })).toBe(1);
  });

  it("recusa voto em si mesmo", async () => {
    const cenario = await comRodadaEncerrada();

    const resultado = await registrarVoto(db, {
      roundId: cenario.rodada.id,
      groupId: cenario.grupo.id,
      voterPlayerId: cenario.elenco[0].id,
      votedPlayerId: cenario.elenco[0].id,
    });

    expect(resultado).toEqual({ ok: false, motivo: "votou-em-si" });
  });

  it("recusa voto de quem não jogou a rodada", async () => {
    const cenario = await comRodadaEncerrada();
    const deFora = await db.player.create({
      data: { groupId: cenario.grupo.id, displayName: "Chegou depois" },
    });

    const resultado = await registrarVoto(db, {
      roundId: cenario.rodada.id,
      groupId: cenario.grupo.id,
      voterPlayerId: deFora.id,
      votedPlayerId: cenario.elenco[0].id,
    });

    expect(resultado).toEqual({ ok: false, motivo: "nao-jogou" });
  });

  it("recusa voto em quem não jogou a rodada", async () => {
    const cenario = await comRodadaEncerrada();
    const deFora = await db.player.create({
      data: { groupId: cenario.grupo.id, displayName: "Chegou depois" },
    });

    const resultado = await registrarVoto(db, {
      roundId: cenario.rodada.id,
      groupId: cenario.grupo.id,
      voterPlayerId: cenario.elenco[0].id,
      votedPlayerId: deFora.id,
    });

    expect(resultado).toEqual({ ok: false, motivo: "votado-nao-jogou" });
  });

  it("recusa rodada de outro grupo — o roundId vem do client", async () => {
    const [meu, outro] = [await comRodadaEncerrada(), await comRodadaEncerrada()];

    const resultado = await registrarVoto(db, {
      roundId: outro.rodada.id,
      groupId: meu.grupo.id,
      voterPlayerId: meu.elenco[0].id,
      votedPlayerId: meu.elenco[1].id,
    });

    expect(resultado).toEqual({ ok: false, motivo: "rodada-de-outro-grupo" });
  });

  it("recusa voto na rodada que ainda não acabou", async () => {
    const cenario = await comRodadaEncerrada();
    await db.round.update({
      where: { id: cenario.rodada.id },
      data: { status: "LIVE" },
    });

    const resultado = await registrarVoto(db, {
      roundId: cenario.rodada.id,
      groupId: cenario.grupo.id,
      voterPlayerId: cenario.elenco[0].id,
      votedPlayerId: cenario.elenco[1].id,
    });

    expect(resultado).toEqual({ ok: false, motivo: "rodada-nao-acabou" });
  });

  it("recusa voto depois do prazo", async () => {
    const cenario = await comRodadaEncerrada();
    const depois = new Date(
      cenario.apito.getTime() + (HORAS_DE_VOTACAO + 1) * 60 * 60 * 1000,
    );

    const resultado = await registrarVoto(db, {
      roundId: cenario.rodada.id,
      groupId: cenario.grupo.id,
      voterPlayerId: cenario.elenco[0].id,
      votedPlayerId: cenario.elenco[1].id,
      agora: depois,
    });

    expect(resultado).toEqual({ ok: false, motivo: "votacao-fechada" });
  });

  it("rodada encerrada antes da coluna existir cai na data da rodada", async () => {
    const cenario = await comRodadaEncerrada();
    // Simula o legado: encerrada, mas sem `finishedAt`, e com data antiga.
    await db.round.update({
      where: { id: cenario.rodada.id },
      data: { finishedAt: null, date: new Date("2026-01-01T23:30:00Z") },
    });

    const resultado = await registrarVoto(db, {
      roundId: cenario.rodada.id,
      groupId: cenario.grupo.id,
      voterPlayerId: cenario.elenco[0].id,
      votedPlayerId: cenario.elenco[1].id,
    });

    expect(resultado).toEqual({ ok: false, motivo: "votacao-fechada" });
  });

  it("apura o vencedor quando há quórum, sem devolver quem votou em quem", async () => {
    const cenario = await comRodadaEncerrada();
    const favorito = cenario.elenco[7].id;

    // 8 jogaram → quórum é max(3, ceil(8/3)) = 3.
    for (const votante of cenario.elenco.slice(0, 4)) {
      await registrarVoto(db, {
        roundId: cenario.rodada.id,
        groupId: cenario.grupo.id,
        voterPlayerId: votante.id,
        votedPlayerId: favorito,
      });
    }

    const situacao = await situacaoDaVotacao(db, cenario.rodada.id, cenario.elenco[0].id);

    expect(situacao?.apuracao.vencedores).toEqual([favorito]);
    expect(situacao?.apuracao.votosDoVencedor).toBe(4);
    expect(situacao?.apuracao.alcancouQuorum).toBe(true);
    expect(Object.keys(situacao!.apuracao)).not.toContain("votos");
  });

  it("sem quórum não elege ninguém, mesmo com voto na urna", async () => {
    const cenario = await comRodadaEncerrada();

    await registrarVoto(db, {
      roundId: cenario.rodada.id,
      groupId: cenario.grupo.id,
      voterPlayerId: cenario.elenco[0].id,
      votedPlayerId: cenario.elenco[1].id,
    });

    const situacao = await situacaoDaVotacao(db, cenario.rodada.id, cenario.elenco[0].id);

    expect(situacao?.apuracao.alcancouQuorum).toBe(false);
    expect(situacao?.apuracao.vencedores).toEqual([]);
  });

  it("a situação não oferece o próprio jogador como candidato", async () => {
    const cenario = await comRodadaEncerrada();

    const situacao = await situacaoDaVotacao(db, cenario.rodada.id, cenario.elenco[0].id);

    expect(situacao?.candidatos).not.toContain(cenario.elenco[0].id);
    expect(situacao?.candidatos).toHaveLength(cenario.elenco.length - 1);
  });
});
