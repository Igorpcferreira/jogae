import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/db/generated/client";
import { criarClientDeTeste, limparBanco, temBancoDeTeste } from "@/test/db";
import { criarCenario } from "@/test/fixtures";
import { sortearTimes } from "@/features/rounds/service";
import {
  aggregatePlayerStats,
  type StatEvent,
  type StatMatch,
  type StatRoster,
} from "@/domain/statistics/aggregate";
import {
  desfazerUltimoLance,
  encerrarPartida,
  encerrarRodada,
  iniciarPartida,
  registrarGol,
} from "./service";

const suite = temBancoDeTeste ? describe : describe.skip;

suite("ao vivo — camada de dados", () => {
  let db: PrismaClient;

  beforeEach(async () => {
    db ??= criarClientDeTeste();
    await limparBanco(db);
  });

  afterAll(async () => {
    await db?.$disconnect();
  });

  /** Rodada com times sorteados e a primeira partida no ar. */
  async function comPartidaEmAndamento() {
    const cenario = await criarCenario(db);
    await sortearTimes(db, cenario.rodada.id, "BALANCED", "SEED-1");

    const times = await db.team.findMany({
      where: { roundId: cenario.rodada.id },
      include: { players: true },
      orderBy: { order: "asc" },
    });

    const partida = await iniciarPartida(
      db,
      cenario.rodada.id,
      times[0].id,
      times[1].id,
    );

    return { ...cenario, times, partida };
  }

  describe("iniciarPartida", () => {
    it("põe a rodada ao vivo", async () => {
      const { rodada, partida } = await comPartidaEmAndamento();

      expect(partida.status).toBe("LIVE");
      expect(partida.startedAt).not.toBeNull();

      const atual = await db.round.findUniqueOrThrow({ where: { id: rodada.id } });
      expect(atual.status).toBe("LIVE");
    });

    it("encerra a partida anterior antes de começar outra", async () => {
      const { rodada, times, partida } = await comPartidaEmAndamento();

      await iniciarPartida(db, rodada.id, times[1].id, times[0].id);

      const anterior = await db.match.findUniqueOrThrow({ where: { id: partida.id } });
      expect(anterior.status).toBe("FINISHED");
      expect(anterior.endedAt).not.toBeNull();

      const emAndamento = await db.match.count({ where: { roundId: rodada.id, status: "LIVE" } });
      expect(emAndamento).toBe(1);
    });

    it("recusa time contra ele mesmo", async () => {
      const { rodada, times } = await comPartidaEmAndamento();
      await expect(
        iniciarPartida(db, rodada.id, times[0].id, times[0].id),
      ).rejects.toThrow(/ele mesmo/i);
    });

    it("recusa time de outra rodada", async () => {
      const { rodada } = await comPartidaEmAndamento();
      const outro = await comPartidaEmAndamento();

      await expect(
        iniciarPartida(db, rodada.id, outro.times[0].id, outro.times[1].id),
      ).rejects.toThrow(/não pertence/i);
    });
  });

  describe("registrarGol", () => {
    it("incrementa o placar do time que marcou", async () => {
      const { partida, times } = await comPartidaEmAndamento();

      await registrarGol(db, { matchId: partida.id, teamId: times[0].id });

      const atual = await db.match.findUniqueOrThrow({ where: { id: partida.id } });
      expect(atual.scoreA).toBe(1);
      expect(atual.scoreB).toBe(0);
    });

    it("guarda autor, assistência e minuto", async () => {
      const { partida, times } = await comPartidaEmAndamento();
      const [autor, assistente] = times[0].players.filter((p) => !p.isGoalkeeper);

      await registrarGol(db, {
        matchId: partida.id,
        teamId: times[0].id,
        playerId: autor.playerId,
        assistPlayerId: assistente.playerId,
      });

      const evento = await db.matchEvent.findFirstOrThrow({
        where: { matchId: partida.id },
      });
      expect(evento.playerId).toBe(autor.playerId);
      expect(evento.assistPlayerId).toBe(assistente.playerId);
      expect(evento.minute).toBeGreaterThanOrEqual(1);
      expect(evento.type).toBe("GOAL");
    });

    it("aceita gol sem autor definido", async () => {
      const { partida, times } = await comPartidaEmAndamento();

      await registrarGol(db, { matchId: partida.id, teamId: times[1].id, playerId: null });

      const atual = await db.match.findUniqueOrThrow({ where: { id: partida.id } });
      expect(atual.scoreB).toBe(1);
    });

    it("recusa gol em partida já encerrada", async () => {
      const { partida, times } = await comPartidaEmAndamento();
      await encerrarPartida(db, partida.id);

      await expect(
        registrarGol(db, { matchId: partida.id, teamId: times[0].id }),
      ).rejects.toThrow(/encerrada/i);
    });

    it("reenvio da fila offline não conta o gol duas vezes", async () => {
      const { partida, times } = await comPartidaEmAndamento();
      const lance = {
        matchId: partida.id,
        teamId: times[0].id,
        clientEventId: "fila-abc",
        minute: 7,
      };

      const primeiro = await registrarGol(db, lance);
      const repetido = await registrarGol(db, lance);

      expect(repetido.id).toBe(primeiro.id);

      const atual = await db.match.findUniqueOrThrow({ where: { id: partida.id } });
      expect(atual.scoreA).toBe(1);
      expect(await db.matchEvent.count({ where: { matchId: partida.id } })).toBe(1);
    });

    it("respeita o minuto que veio do celular offline", async () => {
      const { partida, times } = await comPartidaEmAndamento();

      await registrarGol(db, { matchId: partida.id, teamId: times[0].id, minute: 42 });

      const evento = await db.matchEvent.findFirstOrThrow({ where: { matchId: partida.id } });
      expect(evento.minute).toBe(42);
    });

    it("recusa time que não está em campo", async () => {
      const cenario = await criarCenario(db, { teamCount: 3, jogadores: 12, goleiros: 3 });
      await sortearTimes(db, cenario.rodada.id, "BALANCED", "SEED-3");
      const times = await db.team.findMany({
        where: { roundId: cenario.rodada.id },
        orderBy: { order: "asc" },
      });
      const partida = await iniciarPartida(db, cenario.rodada.id, times[0].id, times[1].id);

      await expect(
        registrarGol(db, { matchId: partida.id, teamId: times[2].id }),
      ).rejects.toThrow(/não participa/i);
    });
  });

  describe("desfazerUltimoLance", () => {
    it("corrige o placar e mantém o rastro", async () => {
      const { partida, times } = await comPartidaEmAndamento();
      const autor = times[0].players.find((p) => !p.isGoalkeeper)!;

      await registrarGol(db, {
        matchId: partida.id,
        teamId: times[0].id,
        playerId: autor.playerId,
      });
      expect(await desfazerUltimoLance(db, partida.id)).toBe(true);

      const atual = await db.match.findUniqueOrThrow({ where: { id: partida.id } });
      expect(atual.scoreA).toBe(0);

      const evento = await db.matchEvent.findFirstOrThrow({ where: { matchId: partida.id } });
      expect(evento.voidedAt).not.toBeNull();
    });

    it("desfaz sempre o mais recente e para quando não há mais nada", async () => {
      const { partida, times } = await comPartidaEmAndamento();

      await registrarGol(db, { matchId: partida.id, teamId: times[0].id });
      await registrarGol(db, { matchId: partida.id, teamId: times[1].id });

      await desfazerUltimoLance(db, partida.id);
      let atual = await db.match.findUniqueOrThrow({ where: { id: partida.id } });
      expect(atual.scoreA).toBe(1);
      expect(atual.scoreB).toBe(0);

      await desfazerUltimoLance(db, partida.id);
      atual = await db.match.findUniqueOrThrow({ where: { id: partida.id } });
      expect(atual.scoreA).toBe(0);

      expect(await desfazerUltimoLance(db, partida.id)).toBe(false);
    });

    it("gol desfeito não conta no ranking", async () => {
      const { rodada, partida, times } = await comPartidaEmAndamento();
      const autor = times[0].players.find((p) => !p.isGoalkeeper)!;

      await registrarGol(db, {
        matchId: partida.id,
        teamId: times[0].id,
        playerId: autor.playerId,
      });
      await registrarGol(db, {
        matchId: partida.id,
        teamId: times[0].id,
        playerId: autor.playerId,
      });
      await desfazerUltimoLance(db, partida.id);
      await encerrarRodada(db, rodada.id);

      const linha = (await estatisticas(db, rodada.id)).find(
        (item) => item.playerId === autor.playerId,
      );
      expect(linha?.goals).toBe(1);
    });
  });

  describe("encerrarRodada", () => {
    it("fecha a partida em andamento junto", async () => {
      const { rodada, partida } = await comPartidaEmAndamento();

      await encerrarRodada(db, rodada.id);

      const atualRodada = await db.round.findUniqueOrThrow({ where: { id: rodada.id } });
      const atualPartida = await db.match.findUniqueOrThrow({ where: { id: partida.id } });
      expect(atualRodada.status).toBe("FINISHED");
      expect(atualPartida.status).toBe("FINISHED");
      expect(atualPartida.endedAt).not.toBeNull();
    });

    it("vitória entra na estatística de quem jogou", async () => {
      const { rodada, partida, times } = await comPartidaEmAndamento();
      const vencedor = times[0].players.find((p) => !p.isGoalkeeper)!;

      await registrarGol(db, {
        matchId: partida.id,
        teamId: times[0].id,
        playerId: vencedor.playerId,
      });
      await encerrarRodada(db, rodada.id);

      const linha = (await estatisticas(db, rodada.id)).find(
        (item) => item.playerId === vencedor.playerId,
      );
      expect(linha?.wins).toBe(1);
      expect(linha?.goals).toBe(1);
    });
  });
});

/**
 * Reproduz o caminho do ranking: lê a rodada do banco e joga no agregador do
 * domínio. É este pedaço que garante que o dado gravado vira estatística certa.
 */
async function estatisticas(db: PrismaClient, roundId: string) {
  const rodada = await db.round.findUniqueOrThrow({
    where: { id: roundId },
    include: {
      teams: { include: { players: true } },
      matches: { include: { events: true } },
    },
  });

  const roster: StatRoster = {};
  for (const time of rodada.teams) {
    roster[time.id] = time.players.map((tp) => tp.playerId);
  }

  const matches: StatMatch[] = rodada.matches.map((partida) => ({
    id: partida.id,
    teamAId: partida.teamAId,
    teamBId: partida.teamBId,
    scoreA: partida.scoreA,
    scoreB: partida.scoreB,
    status: partida.status,
  }));

  const events: StatEvent[] = rodada.matches.flatMap((partida) =>
    partida.events.map((evento) => ({
      matchId: evento.matchId,
      type: evento.type,
      teamId: evento.teamId,
      playerId: evento.playerId,
      assistPlayerId: evento.assistPlayerId,
      voidedAt: evento.voidedAt,
    })),
  );

  return [...aggregatePlayerStats(matches, events, roster).values()];
}
