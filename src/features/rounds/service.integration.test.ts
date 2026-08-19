import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/db/generated/client";
import { criarClientDeTeste, limparBanco, temBancoDeTeste } from "@/test/db";
import { adicionarAlias, criarCenario } from "@/test/fixtures";
import {
  alternarGoleiro,
  alternarTrava,
  aplicarLista,
  conferirJogadoresDoGrupo,
  criarRodada,
  interpretarLista,
  mudarPresenca,
  promoverDaEspera,
  sortearTimes,
  duplicarRodada,
  atualizarTime,
  trocarJogadores,
} from "./service";

const suite = temBancoDeTeste ? describe : describe.skip;

suite("rodada — camada de dados", () => {
  let db: PrismaClient;

  beforeEach(async () => {
    db ??= criarClientDeTeste();
    await limparBanco(db);
  });

  afterAll(async () => {
    await db?.$disconnect();
  });

  describe("aplicarLista", () => {
    it("cria jogador novo que veio na lista", async () => {
      const { grupo, rodada } = await criarCenario(db);

      await aplicarLista(db, rodada.id, [
        { name: "Pedrão", section: "confirmed", playerId: null },
        { name: "Juliel", section: "waiting", playerId: null },
      ]);

      const novos = await db.player.findMany({
        where: { groupId: grupo.id, displayName: { in: ["Pedrão", "Juliel"] } },
      });
      expect(novos).toHaveLength(2);

      const presencas = await db.attendance.findMany({ where: { roundId: rodada.id } });
      expect(presencas).toHaveLength(2);
      expect(presencas.filter((p) => p.status === "WAITING")).toHaveLength(1);
    });

    it("aprende o alias quando o organizador confirma o vínculo", async () => {
      const { rodada, elenco } = await criarCenario(db);
      const jogador = elenco.find((j) => !j.isGoalkeeper)!;

      await aplicarLista(db, rodada.id, [
        {
          name: jogador.displayName,
          section: "confirmed",
          playerId: jogador.id,
          rawName: "Jogadinho",
        },
      ]);

      const aliases = await db.playerAlias.findMany({ where: { playerId: jogador.id } });
      expect(aliases.map((a) => a.normalized)).toContain("jogadinho");
    });

    it("não cria alias quando o nome da lista é o próprio nome", async () => {
      const { rodada, elenco } = await criarCenario(db);
      const jogador = elenco[0];

      await aplicarLista(db, rodada.id, [
        {
          name: jogador.displayName,
          section: "confirmed",
          playerId: jogador.id,
          rawName: jogador.displayName.toUpperCase(),
        },
      ]);

      expect(await db.playerAlias.count({ where: { playerId: jogador.id } })).toBe(0);
    });

    it("substitui as presenças anteriores em vez de somar", async () => {
      const { rodada, elenco } = await criarCenario(db);
      expect(await db.attendance.count({ where: { roundId: rodada.id } })).toBe(
        elenco.length,
      );

      await aplicarLista(db, rodada.id, [
        { name: elenco[0].displayName, section: "confirmed", playerId: elenco[0].id },
      ]);

      expect(await db.attendance.count({ where: { roundId: rodada.id } })).toBe(1);
    });

    it("deduplica jogador repetido mantendo a primeira ocorrência", async () => {
      const { rodada, elenco } = await criarCenario(db);
      const jogador = elenco[0];

      const resultado = await aplicarLista(db, rodada.id, [
        { name: jogador.displayName, section: "confirmed", playerId: jogador.id },
        { name: jogador.displayName, section: "waiting", playerId: jogador.id },
      ]);

      expect(resultado.confirmed).toBe(1);
      expect(resultado.waiting).toBe(0);
    });

    it("marca a rodada como confirmada", async () => {
      const { rodada, elenco } = await criarCenario(db);
      await db.round.update({ where: { id: rodada.id }, data: { status: "OPEN" } });

      await aplicarLista(db, rodada.id, [
        { name: elenco[0].displayName, section: "confirmed", playerId: elenco[0].id },
      ]);

      const atual = await db.round.findUniqueOrThrow({ where: { id: rodada.id } });
      expect(atual.status).toBe("CONFIRMED");
    });

    it("recusa jogador de outro grupo", async () => {
      const a = await criarCenario(db);
      const b = await criarCenario(db);

      await expect(
        aplicarLista(db, a.rodada.id, [
          { name: "Intruso", section: "confirmed", playerId: b.elenco[0].id },
        ]),
      ).rejects.toThrow(/não pertence/i);
    });
  });

  describe("interpretarLista", () => {
    it("casa o nome da lista com o alias já aprendido", async () => {
      const { rodada, elenco } = await criarCenario(db);
      const jogador = elenco.find((j) => !j.isGoalkeeper)!;
      await adicionarAlias(db, jogador.id, "Zezinho");

      const resultado = await interpretarLista(db, rodada.id, "01-Zezinho");
      const entrada = resultado.entries[0];

      expect(entrada.matchedPlayerId).toBe(jogador.id);
    });
  });

  describe("presença", () => {
    it("promover da espera põe o jogador no fim dos confirmados", async () => {
      const { rodada, elenco } = await criarCenario(db);
      const ultimo = elenco[elenco.length - 1];

      await db.attendance.update({
        where: { roundId_playerId: { roundId: rodada.id, playerId: ultimo.id } },
        data: { status: "WAITING", order: 0 },
      });

      const confirmadosAntes = await db.attendance.count({
        where: { roundId: rodada.id, status: "CONFIRMED" },
      });

      await promoverDaEspera(db, rodada.id, ultimo.id);

      const presenca = await db.attendance.findUniqueOrThrow({
        where: { roundId_playerId: { roundId: rodada.id, playerId: ultimo.id } },
      });
      expect(presenca.status).toBe("CONFIRMED");
      expect(presenca.order).toBe(confirmadosAntes);
    });

    it("alternar goleiro vai e volta", async () => {
      const { rodada, elenco } = await criarCenario(db);
      const linha = elenco.find((j) => !j.isGoalkeeper)!;

      await alternarGoleiro(db, rodada.id, linha.id);
      let presenca = await db.attendance.findUniqueOrThrow({
        where: { roundId_playerId: { roundId: rodada.id, playerId: linha.id } },
      });
      expect(presenca.asGoalkeeper).toBe(true);

      await alternarGoleiro(db, rodada.id, linha.id);
      presenca = await db.attendance.findUniqueOrThrow({
        where: { roundId_playerId: { roundId: rodada.id, playerId: linha.id } },
      });
      expect(presenca.asGoalkeeper).toBe(false);
    });
  });

  describe("sortearTimes", () => {
    it("cria os times sem perder nem duplicar jogador", async () => {
      const { rodada, elenco } = await criarCenario(db);

      await sortearTimes(db, rodada.id, "BALANCED", "SEED-1");

      const times = await db.team.findMany({
        where: { roundId: rodada.id },
        include: { players: true },
        orderBy: { order: "asc" },
      });

      expect(times).toHaveLength(2);
      const escalados = times.flatMap((t) => t.players.map((p) => p.playerId));
      expect(escalados).toHaveLength(elenco.length);
      expect(new Set(escalados).size).toBe(elenco.length);
    });

    it("guarda o rastro do sorteio para a tela de transparência", async () => {
      const { rodada } = await criarCenario(db);

      await sortearTimes(db, rodada.id, "BALANCED", "SEED-XYZ");

      const atual = await db.round.findUniqueOrThrow({ where: { id: rodada.id } });
      expect(atual.drawMode).toBe("BALANCED");
      expect(atual.drawSeed).toBe("SEED-XYZ");
      expect(atual.drawnAt).not.toBeNull();
      expect(atual.manualEdits).toBe(0);
    });

    it("resortear preserva quem estava travado", async () => {
      const { rodada, elenco } = await criarCenario(db);
      await sortearTimes(db, rodada.id, "BALANCED", "SEED-1");

      const time0 = await db.team.findFirstOrThrow({
        where: { roundId: rodada.id, order: 0 },
        include: { players: true },
      });
      const travado = time0.players.find((p) => !p.isGoalkeeper)!;
      await alternarTrava(db, rodada.id, travado.playerId);

      await sortearTimes(db, rodada.id, "RANDOM", "SEED-2");

      const depois = await db.teamPlayer.findFirstOrThrow({
        where: { playerId: travado.playerId, team: { roundId: rodada.id } },
        include: { team: true },
      });
      expect(depois.team.order).toBe(0);
      expect(depois.locked).toBe(true);
      expect(elenco.length).toBeGreaterThan(0);
    });

    it("mesma seed produz o mesmo resultado", async () => {
      const primeiro = await criarCenario(db);
      await sortearTimes(db, primeiro.rodada.id, "BALANCED", "IGUAL");
      const timesA = await db.team.findMany({
        where: { roundId: primeiro.rodada.id },
        include: { players: true },
        orderBy: { order: "asc" },
      });

      await sortearTimes(db, primeiro.rodada.id, "BALANCED", "IGUAL");
      const timesB = await db.team.findMany({
        where: { roundId: primeiro.rodada.id },
        include: { players: true },
        orderBy: { order: "asc" },
      });

      const chave = (times: typeof timesA) =>
        times.map((t) => t.players.map((p) => p.playerId).sort().join(",")).join("|");
      expect(chave(timesA)).toBe(chave(timesB));
    });
  });

  describe("trocarJogadores", () => {
    it("troca de time e registra a edição manual", async () => {
      const { rodada } = await criarCenario(db);
      await sortearTimes(db, rodada.id, "BALANCED", "SEED-1");

      const [timeA, timeB] = await db.team.findMany({
        where: { roundId: rodada.id },
        include: { players: true },
        orderBy: { order: "asc" },
      });
      const a = timeA.players.find((p) => !p.isGoalkeeper)!;
      const b = timeB.players.find((p) => !p.isGoalkeeper)!;

      await trocarJogadores(db, rodada.id, a.playerId, b.playerId);

      const novoA = await db.teamPlayer.findFirstOrThrow({
        where: { playerId: a.playerId, team: { roundId: rodada.id } },
      });
      expect(novoA.teamId).toBe(timeB.id);

      const atual = await db.round.findUniqueOrThrow({ where: { id: rodada.id } });
      expect(atual.manualEdits).toBe(1);
      expect(atual.drawMode).toBe("MANUAL");
    });

    it("trocar dois do mesmo time não faz nada", async () => {
      const { rodada } = await criarCenario(db);
      await sortearTimes(db, rodada.id, "BALANCED", "SEED-1");

      const time = await db.team.findFirstOrThrow({
        where: { roundId: rodada.id, order: 0 },
        include: { players: true },
      });
      const [a, b] = time.players.filter((p) => !p.isGoalkeeper);

      await trocarJogadores(db, rodada.id, a.playerId, b.playerId);

      const atual = await db.round.findUniqueOrThrow({ where: { id: rodada.id } });
      expect(atual.manualEdits).toBe(0);
    });
  });

  describe("criarRodada", () => {
    it("herda o formato e o local do grupo", async () => {
      const { grupo } = await criarCenario(db);

      const rodada = await criarRodada(db, grupo.id);

      expect(rodada.teamCount).toBe(grupo.teamCount);
      expect(rodada.fieldPlayersPerTeam).toBe(grupo.fieldPlayersPerTeam);
      expect(rodada.goalkeeperMode).toBe(grupo.goalkeeperMode);
      expect(rodada.status).toBe("OPEN");
      expect(rodada.date.getTime()).toBeGreaterThan(Date.now());
    });
  });


  describe("duplicarRodada", () => {
    it("repete a lista da rodada anterior numa data nova", async () => {
      const { grupo, rodada, elenco } = await criarCenario(db);

      const resultado = await duplicarRodada(db, grupo.id);

      expect(resultado).not.toBeNull();
      expect(resultado!.copiados).toBe(elenco.length);
      expect(resultado!.round.id).not.toBe(rodada.id);
      // Nasce confirmada: a rodada duplicada pula a importacao da lista.
      expect(resultado!.round.status).toBe("CONFIRMED");
      expect(resultado!.round.date.getTime()).toBeGreaterThan(rodada.date.getTime());

      const presencas = await db.attendance.findMany({
        where: { roundId: resultado!.round.id },
      });
      expect(presencas).toHaveLength(elenco.length);
    });

    it("nao leva junto quem saiu do grupo nem quem faltou", async () => {
      const { grupo, rodada, elenco } = await criarCenario(db);

      await db.player.update({
        where: { id: elenco[0].id },
        data: { active: false },
      });
      await db.attendance.update({
        where: { roundId_playerId: { roundId: rodada.id, playerId: elenco[1].id } },
        data: { status: "ABSENT" },
      });

      const resultado = await duplicarRodada(db, grupo.id);

      const presencas = await db.attendance.findMany({
        where: { roundId: resultado!.round.id },
        select: { playerId: true },
      });
      const ids = presencas.map((presenca) => presenca.playerId);
      expect(ids).not.toContain(elenco[0].id);
      expect(ids).not.toContain(elenco[1].id);
      expect(ids).toHaveLength(elenco.length - 2);
    });

    it("preserva a espera como espera", async () => {
      const { grupo, rodada, elenco } = await criarCenario(db);
      await db.attendance.update({
        where: { roundId_playerId: { roundId: rodada.id, playerId: elenco[2].id } },
        data: { status: "WAITING" },
      });

      const resultado = await duplicarRodada(db, grupo.id);

      const copiada = await db.attendance.findUniqueOrThrow({
        where: {
          roundId_playerId: { roundId: resultado!.round.id, playerId: elenco[2].id },
        },
      });
      expect(copiada.status).toBe("WAITING");
    });

    it("devolve nulo quando nao ha rodada com gente", async () => {
      const usuario = await db.user.create({
        data: { name: "Solo", email: `${Date.now()}-solo@teste.local` },
      });
      const vazio = await db.footballGroup.create({
        data: {
          name: "Grupo Vazio",
          slug: `vazio-${Date.now()}`,
          teamCount: 2,
          fieldPlayersPerTeam: 4,
          goalkeepersPerTeam: 1,
          goalkeeperMode: "FIXED_PER_TEAM",
          memberships: { create: { userId: usuario.id, role: "OWNER" } },
        },
      });

      expect(await duplicarRodada(db, vazio.id)).toBeNull();
    });
  });

  describe("atualizarTime", () => {
    it("renomeia e troca a cor sem mexer no elenco do time", async () => {
      const { rodada } = await criarCenario(db);
      await sortearTimes(db, rodada.id, "BALANCED", "seed-time");

      const time = await db.team.findFirstOrThrow({
        where: { roundId: rodada.id },
        include: { players: true },
      });

      await atualizarTime(db, time.id, { name: "Coletes", color: "pink" });

      const depois = await db.team.findUniqueOrThrow({
        where: { id: time.id },
        include: { players: true },
      });
      expect(depois.name).toBe("Coletes");
      expect(depois.color).toBe("pink");
      expect(depois.players).toHaveLength(time.players.length);
    });
  });

  describe("conferirJogadoresDoGrupo", () => {
    it("aceita lista vazia e ids nulos", async () => {
      const { grupo } = await criarCenario(db);
      await expect(
        conferirJogadoresDoGrupo(db, grupo.id, [null, undefined]),
      ).resolves.toBeUndefined();
    });
  });

  describe("mudarPresenca — o link pessoal do jogador", () => {
    /** Um jogador a mais que a capacidade, parado na espera. */
    async function comEspera(db: PrismaClient) {
      const cenario = await criarCenario(db);
      const suplente = await db.player.create({
        data: { groupId: cenario.grupo.id, displayName: "Suplente", skillLevel: 3 },
      });
      await db.attendance.create({
        data: {
          roundId: cenario.rodada.id,
          playerId: suplente.id,
          status: "WAITING",
          order: 99,
        },
      });
      return { ...cenario, suplente };
    }

    it("cancelou pelo link: sai da lista e o primeiro da espera sobe", async () => {
      const { rodada, elenco, suplente } = await comEspera(db);
      const quemSai = elenco.find((jogador) => !jogador.isGoalkeeper)!;

      const { resultado, promovido } = await mudarPresenca(db, {
        roundId: rodada.id,
        playerId: quemSai.id,
        acao: "cancelar",
        origem: "PLAYER",
      });

      expect(resultado.ok).toBe(true);
      expect(promovido?.id).toBe(suplente.id);

      const [saiu, subiu] = await Promise.all([
        db.attendance.findUniqueOrThrow({
          where: { roundId_playerId: { roundId: rodada.id, playerId: quemSai.id } },
        }),
        db.attendance.findUniqueOrThrow({
          where: { roundId_playerId: { roundId: rodada.id, playerId: suplente.id } },
        }),
      ]);

      expect(saiu.status).toBe("ABSENT");
      expect(subiu.status).toBe("CONFIRMED");
      // Quem clicou é PLAYER; quem subiu não escolheu nada e mantém a origem.
      expect(saiu.origin).toBe("PLAYER");
      expect(subiu.origin).toBe("ORGANIZER");
    });

    it("goleiro que cai é substituído pelo goleiro da espera", async () => {
      const { grupo, rodada, elenco } = await criarCenario(db);
      const goleiroDeFora = await db.player.create({
        data: {
          groupId: grupo.id,
          displayName: "Goleiro reserva",
          isGoalkeeper: true,
          skillLevel: 3,
        },
      });
      const linhaDeFora = await db.player.create({
        data: { groupId: grupo.id, displayName: "Linha reserva", skillLevel: 3 },
      });
      // O de linha chegou antes: sem a regra do gol, seria ele a subir.
      await db.attendance.createMany({
        data: [
          { roundId: rodada.id, playerId: linhaDeFora.id, status: "WAITING", order: 50 },
          { roundId: rodada.id, playerId: goleiroDeFora.id, status: "WAITING", order: 51 },
        ],
      });

      const goleiroQueSai = elenco.find((jogador) => jogador.isGoalkeeper)!;
      const { promovido } = await mudarPresenca(db, {
        roundId: rodada.id,
        playerId: goleiroQueSai.id,
        acao: "cancelar",
        origem: "PLAYER",
      });

      expect(promovido?.id).toBe(goleiroDeFora.id);
      const subiu = await db.attendance.findUniqueOrThrow({
        where: {
          roundId_playerId: { roundId: rodada.id, playerId: goleiroDeFora.id },
        },
      });
      expect(subiu.asGoalkeeper).toBe(true);
    });

    it("confirmar com a lista cheia cria presença na espera", async () => {
      const { grupo, rodada } = await criarCenario(db);
      const novo = await db.player.create({
        data: { groupId: grupo.id, displayName: "Atrasado", skillLevel: 3 },
      });

      const { resultado } = await mudarPresenca(db, {
        roundId: rodada.id,
        playerId: novo.id,
        acao: "confirmar",
        origem: "PLAYER",
      });

      expect(resultado).toMatchObject({ ok: true, status: "WAITING" });
      const presenca = await db.attendance.findUniqueOrThrow({
        where: { roundId_playerId: { roundId: rodada.id, playerId: novo.id } },
      });
      expect(presenca.status).toBe("WAITING");
      expect(presenca.origin).toBe("PLAYER");
    });

    it("clicar duas vezes no link não duplica nem muda nada", async () => {
      const { rodada, elenco } = await criarCenario(db);
      const jogador = elenco[0];

      await mudarPresenca(db, {
        roundId: rodada.id,
        playerId: jogador.id,
        acao: "confirmar",
        origem: "PLAYER",
      });
      const { resultado } = await mudarPresenca(db, {
        roundId: rodada.id,
        playerId: jogador.id,
        acao: "confirmar",
        origem: "PLAYER",
      });

      expect(resultado.ok && resultado.mudancas).toEqual([]);
      const presencas = await db.attendance.findMany({
        where: { roundId: rodada.id, playerId: jogador.id },
      });
      expect(presencas).toHaveLength(1);
    });

    it("recusa jogador de outro grupo", async () => {
      const { rodada } = await criarCenario(db);
      const outro = await criarCenario(db);

      await expect(
        mudarPresenca(db, {
          roundId: rodada.id,
          playerId: outro.elenco[0].id,
          acao: "cancelar",
          origem: "PLAYER",
        }),
      ).rejects.toThrow(/não pertence/i);
    });

    it("rodada ao vivo não aceita mais mudança", async () => {
      const { rodada, elenco } = await criarCenario(db);
      await db.round.update({ where: { id: rodada.id }, data: { status: "LIVE" } });

      const { resultado } = await mudarPresenca(db, {
        roundId: rodada.id,
        playerId: elenco[0].id,
        acao: "cancelar",
        origem: "PLAYER",
      });

      expect(resultado.ok).toBe(false);
      const presenca = await db.attendance.findUniqueOrThrow({
        where: { roundId_playerId: { roundId: rodada.id, playerId: elenco[0].id } },
      });
      expect(presenca.status).toBe("CONFIRMED");
    });
  });
});
