import { describe, expect, it } from "vitest";
import {
  aggregatePlayerStats,
  aggregateTeamStats,
  buildRanking,
  mvpDaRodada,
  type StatEvent,
  type StatMatch,
} from "./aggregate";

const roster = {
  verde: ["salles", "guilherme"],
  rosa: ["pedrao", "danilo"],
};

const matches: StatMatch[] = [
  { id: "m1", teamAId: "verde", teamBId: "rosa", scoreA: 2, scoreB: 1, status: "FINISHED" },
  { id: "m2", teamAId: "rosa", teamBId: "verde", scoreA: 1, scoreB: 1, status: "FINISHED" },
];

const events: StatEvent[] = [
  {
    matchId: "m1",
    type: "GOAL",
    teamId: "verde",
    playerId: "salles",
    assistPlayerId: "guilherme",
    voidedAt: null,
  },
  {
    matchId: "m1",
    type: "GOAL",
    teamId: "verde",
    playerId: "salles",
    assistPlayerId: null,
    voidedAt: null,
  },
  {
    matchId: "m1",
    type: "GOAL",
    teamId: "rosa",
    playerId: "pedrao",
    assistPlayerId: "danilo",
    voidedAt: null,
  },
  {
    matchId: "m2",
    type: "GOAL",
    teamId: "rosa",
    playerId: "pedrao",
    assistPlayerId: null,
    voidedAt: null,
  },
  {
    matchId: "m2",
    type: "GOAL",
    teamId: "verde",
    playerId: "guilherme",
    assistPlayerId: null,
    voidedAt: null,
  },
];

describe("aggregateTeamStats", () => {
  it("calcula pontos, saldo e aproveitamento", () => {
    const stats = aggregateTeamStats(matches);
    const verde = stats.get("verde")!;
    const rosa = stats.get("rosa")!;

    expect(verde).toMatchObject({ played: 2, wins: 1, draws: 1, losses: 0, points: 4 });
    expect(verde.goalsFor).toBe(3);
    expect(verde.goalsAgainst).toBe(2);
    expect(verde.goalDiff).toBe(1);
    expect(rosa).toMatchObject({ played: 2, wins: 0, draws: 1, losses: 1, points: 1 });
  });

  it("ignora partida que ainda não terminou", () => {
    const stats = aggregateTeamStats([
      ...matches,
      { id: "m3", teamAId: "verde", teamBId: "rosa", scoreA: 5, scoreB: 0, status: "LIVE" },
    ]);
    expect(stats.get("verde")!.played).toBe(2);
  });
});

describe("aggregatePlayerStats", () => {
  it("soma gols, assistências e participações", () => {
    const stats = aggregatePlayerStats(matches, events, roster);
    expect(stats.get("salles")).toMatchObject({ goals: 2, assists: 0, contributions: 2 });
    expect(stats.get("guilherme")).toMatchObject({ goals: 1, assists: 1, contributions: 2 });
    expect(stats.get("pedrao")).toMatchObject({ goals: 2, assists: 0 });
    expect(stats.get("danilo")).toMatchObject({ goals: 0, assists: 1, contributions: 1 });
  });

  it("desfazer lance corrige a estatística", () => {
    const withUndo: StatEvent[] = [
      ...events.slice(0, 1).map((e) => ({ ...e, voidedAt: new Date() })),
      ...events.slice(1),
    ];
    const stats = aggregatePlayerStats(matches, withUndo, roster);
    expect(stats.get("salles")!.goals).toBe(1);
    expect(stats.get("guilherme")!.assists).toBe(0);
  });

  it("gol contra não vira gol do autor", () => {
    const stats = aggregatePlayerStats(
      matches,
      [
        {
          matchId: "m1",
          type: "OWN_GOAL",
          teamId: "verde",
          playerId: "pedrao",
          assistPlayerId: null,
          voidedAt: null,
        },
      ],
      roster,
    );
    expect(stats.get("pedrao")!.goals).toBe(0);
  });

  it("conta vitórias, empates e aproveitamento por jogador", () => {
    const stats = aggregatePlayerStats(matches, events, roster);
    expect(stats.get("salles")).toMatchObject({
      matchesPlayed: 2,
      wins: 1,
      draws: 1,
      losses: 0,
    });
    expect(stats.get("salles")!.winRate).toBeCloseTo(0.5);
  });

  it("inclui jogador escalado que não marcou", () => {
    const stats = aggregatePlayerStats([], [], { verde: ["reserva"] });
    expect(stats.get("reserva")).toMatchObject({ goals: 0, matchesPlayed: 0, winRate: 0 });
  });
});

describe("buildRanking", () => {
  const stats = aggregatePlayerStats(matches, events, roster);

  it("ordena por artilharia", () => {
    const ranking = buildRanking(stats.values(), "goals");
    expect(ranking[0].goals).toBe(2);
    expect(ranking.at(-1)!.goals).toBe(0);
  });

  it("empate compartilha a mesma posição", () => {
    const ranking = buildRanking(stats.values(), "goals");
    const positions = ranking.filter((r) => r.goals === 2).map((r) => r.position);
    expect(new Set(positions).size).toBe(1);
    expect(positions[0]).toBe(1);
  });

  it("ranking de presença usa o mapa externo", () => {
    const ranking = buildRanking(stats.values(), "presence", {
      danilo: 12,
      salles: 3,
    });
    expect(ranking[0].playerId).toBe("danilo");
    expect(ranking[0].presence).toBe(12);
  });

  it("é estável para a mesma entrada", () => {
    const a = buildRanking(stats.values(), "contributions");
    const b = buildRanking(stats.values(), "contributions");
    expect(b.map((r) => r.playerId)).toEqual(a.map((r) => r.playerId));
  });
});

describe("mvpDaRodada", () => {
  const base = {
    matchesPlayed: 2,
    draws: 0,
    losses: 0,
    winRate: 0.5,
  };

  it("elege quem mais participou de gol", () => {
    const mvp = mvpDaRodada([
      { playerId: "salles", goals: 3, assists: 1, contributions: 4, wins: 1, ...base },
      { playerId: "danilo", goals: 1, assists: 1, contributions: 2, wins: 2, ...base },
    ]);
    expect(mvp?.playerId).toBe("salles");
    expect(mvp?.contributions).toBe(4);
  });

  it("desempata por gols e depois por vitórias", () => {
    const porGols = mvpDaRodada([
      { playerId: "a", goals: 1, assists: 2, contributions: 3, wins: 1, ...base },
      { playerId: "b", goals: 3, assists: 0, contributions: 3, wins: 1, ...base },
    ]);
    expect(porGols?.playerId).toBe("b");

    const porVitorias = mvpDaRodada([
      { playerId: "a", goals: 2, assists: 1, contributions: 3, wins: 0, ...base },
      { playerId: "b", goals: 2, assists: 1, contributions: 3, wins: 2, ...base },
    ]);
    expect(porVitorias?.playerId).toBe("b");
  });

  it("empate total não elege ninguém", () => {
    expect(
      mvpDaRodada([
        { playerId: "a", goals: 2, assists: 0, contributions: 2, wins: 1, ...base },
        { playerId: "b", goals: 2, assists: 0, contributions: 2, wins: 1, ...base },
      ]),
    ).toBeNull();
  });

  it("rodada sem gol não tem MVP", () => {
    expect(
      mvpDaRodada([
        { playerId: "a", goals: 0, assists: 0, contributions: 0, wins: 1, ...base },
      ]),
    ).toBeNull();
  });
});
