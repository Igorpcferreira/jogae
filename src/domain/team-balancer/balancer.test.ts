import { describe, expect, it } from "vitest";
import { balanceTeams } from "./balancer";
import type { BalanceInput, BalancePlayer } from "./types";

function makePlayers(count: number, overrides: Partial<BalancePlayer> = {}): BalancePlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    skillLevel: (i % 5) + 1,
    preferredRole: (["DEFENDER", "MIDFIELDER", "FORWARD"] as const)[i % 3],
    ...overrides,
  }));
}

const base: Omit<BalanceInput, "players"> = {
  teamCount: 4,
  fieldPlayersPerTeam: 5,
  goalkeeperMode: "FIXED_PER_TEAM",
  mode: "BALANCED",
  seed: "TESTE01",
};

const allAssigned = (result: ReturnType<typeof balanceTeams>) => [
  ...result.teams.flatMap((t) => [...t.playerIds, ...t.goalkeeperIds]),
  ...result.goalkeeperPool,
  ...result.bench,
];

describe("balanceTeams — invariantes", () => {
  it("não perde nem duplica jogador", () => {
    const players = makePlayers(20);
    const result = balanceTeams({ ...base, players });
    const assigned = allAssigned(result);

    expect(assigned).toHaveLength(20);
    expect(new Set(assigned).size).toBe(20);
    expect([...assigned].sort()).toEqual(players.map((p) => p.id).sort());
  });

  it("respeita a capacidade de cada time", () => {
    const result = balanceTeams({ ...base, players: makePlayers(20) });
    for (const team of result.teams) {
      expect(team.playerIds).toHaveLength(5);
    }
    expect(result.bench).toHaveLength(0);
  });

  it("manda o excedente pro banco em vez de estourar o time", () => {
    const result = balanceTeams({ ...base, players: makePlayers(23) });
    expect(result.bench).toHaveLength(3);
    expect(allAssigned(result)).toHaveLength(23);
  });

  it("distribui de forma equilibrada quando falta gente", () => {
    const result = balanceTeams({ ...base, players: makePlayers(14) });
    const sizes = result.teams.map((t) => t.playerIds.length).sort();
    expect(sizes).toEqual([3, 3, 4, 4]);
    expect(allAssigned(result)).toHaveLength(14);
  });

  it("funciona em outros formatos de grupo", () => {
    const formats = [
      { teamCount: 2, fieldPlayersPerTeam: 6, total: 12 },
      { teamCount: 3, fieldPlayersPerTeam: 5, total: 15 },
      { teamCount: 5, fieldPlayersPerTeam: 4, total: 20 },
    ];
    for (const format of formats) {
      const result = balanceTeams({
        ...base,
        teamCount: format.teamCount,
        fieldPlayersPerTeam: format.fieldPlayersPerTeam,
        players: makePlayers(format.total),
      });
      expect(result.teams).toHaveLength(format.teamCount);
      for (const team of result.teams) {
        expect(team.playerIds).toHaveLength(format.fieldPlayersPerTeam);
      }
    }
  });
});

describe("balanceTeams — seed", () => {
  it("mesma seed produz exatamente o mesmo resultado", () => {
    const players = makePlayers(20);
    const a = balanceTeams({ ...base, players });
    const b = balanceTeams({ ...base, players });
    expect(b.teams).toEqual(a.teams);
  });

  it("seeds diferentes produzem resultados diferentes", () => {
    const players = makePlayers(20);
    const a = balanceTeams({ ...base, players, seed: "AAA" });
    const b = balanceTeams({ ...base, players, seed: "BBB" });
    expect(b.teams).not.toEqual(a.teams);
  });

  it("sorteio puro também é reproduzível", () => {
    const players = makePlayers(20);
    const a = balanceTeams({ ...base, players, mode: "RANDOM" });
    const b = balanceTeams({ ...base, players, mode: "RANDOM" });
    expect(b.teams).toEqual(a.teams);
    expect(a.score).toBe(0);
  });
});

describe("balanceTeams — locks", () => {
  it("mantém o jogador travado no time escolhido", () => {
    const players = makePlayers(20);
    players[0].lockedTeamIndex = 2;
    players[1].lockedTeamIndex = 2;
    players[19].lockedTeamIndex = 0;

    const result = balanceTeams({ ...base, players, seed: "LOCK" });
    expect(result.teams[2].playerIds).toContain("p1");
    expect(result.teams[2].playerIds).toContain("p2");
    expect(result.teams[0].playerIds).toContain("p20");
  });

  it("ignora lock inválido sem perder o jogador", () => {
    const players = makePlayers(20);
    players[0].lockedTeamIndex = 99;
    const result = balanceTeams({ ...base, players });
    expect(allAssigned(result)).toContain("p1");
    expect(allAssigned(result)).toHaveLength(20);
  });
});

describe("balanceTeams — goleiros", () => {
  const withGks = (): BalancePlayer[] => [
    ...makePlayers(20),
    { id: "gk1", skillLevel: 3, isGoalkeeper: true },
    { id: "gk2", skillLevel: 3, isGoalkeeper: true },
    { id: "gk3", skillLevel: 3, isGoalkeeper: true },
    { id: "gk4", skillLevel: 3, isGoalkeeper: true },
  ];

  it("FIXED_PER_TEAM dá um goleiro por time", () => {
    const result = balanceTeams({ ...base, players: withGks() });
    for (const team of result.teams) {
      expect(team.goalkeeperIds).toHaveLength(1);
    }
    expect(result.goalkeeperPool).toHaveLength(0);
    expect(allAssigned(result)).toHaveLength(24);
  });

  it("goleiro que sobra vai jogar na linha", () => {
    const players: BalancePlayer[] = [
      ...withGks(),
      { id: "gk5", skillLevel: 3, isGoalkeeper: true },
    ];
    const result = balanceTeams({ ...base, players, fieldPlayersPerTeam: 6 });
    const gkIds = ["gk1", "gk2", "gk3", "gk4", "gk5"];
    const gksInTeams = result.teams.flatMap((t) => t.goalkeeperIds);
    const gksOnField = result.teams
      .flatMap((t) => t.playerIds)
      .filter((id) => gkIds.includes(id));

    expect(gksInTeams).toHaveLength(4);
    // Qual goleiro sobra é decisão do sorteio; o que importa é que ele não some.
    expect(gksOnField).toHaveLength(1);
    expect(allAssigned(result)).toHaveLength(25);
  });

  it("com menos goleiros que times, sobra time sem goleiro sem quebrar", () => {
    const players: BalancePlayer[] = [
      ...makePlayers(20),
      { id: "gk1", skillLevel: 3, isGoalkeeper: true },
      { id: "gk2", skillLevel: 3, isGoalkeeper: true },
    ];
    const result = balanceTeams({ ...base, players });
    const withGk = result.teams.filter((t) => t.goalkeeperIds.length === 1);
    expect(withGk).toHaveLength(2);
    expect(allAssigned(result)).toHaveLength(22);
  });

  it("POOL mantém os goleiros fora dos times", () => {
    const result = balanceTeams({ ...base, players: withGks(), goalkeeperMode: "POOL" });
    expect(result.goalkeeperPool).toHaveLength(4);
    expect(result.teams.flatMap((t) => t.goalkeeperIds)).toHaveLength(0);
  });

  it("ROTATING trata goleiro como jogador de linha", () => {
    const result = balanceTeams({ ...base, players: withGks(), goalkeeperMode: "ROTATING" });
    expect(result.goalkeeperPool).toHaveLength(0);
    expect(result.teams.flatMap((t) => t.playerIds)).toContain("gk1");
  });

  it("respeita goleiro travado num time específico", () => {
    const players = withGks();
    players[21].lockedTeamIndex = 3; // gk2
    const result = balanceTeams({ ...base, players, seed: "GKLOCK" });
    expect(result.teams[3].goalkeeperIds).toEqual(["gk2"]);
  });
});

describe("balanceTeams — qualidade do equilíbrio", () => {
  it("equilibrado atinge o ótimo mesmo com discrepância grande", () => {
    // 10 jogadores nível 5 e 10 nível 1 em 4 times de 5.
    // Só existem divisões 3+2 e 2+3 → o menor spread possível é 4.
    const players: BalancePlayer[] = [
      ...Array.from({ length: 10 }, (_, i) => ({ id: `forte${i}`, skillLevel: 5 })),
      ...Array.from({ length: 10 }, (_, i) => ({ id: `fraco${i}`, skillLevel: 1 })),
    ];
    const balanced = balanceTeams({ ...base, players, seed: "QUALIDADE" });
    expect(balanced.strengthSpread).toBe(4);
  });

  it("equilibrado é consistentemente mais justo que sorteio puro", () => {
    const players: BalancePlayer[] = [
      ...Array.from({ length: 10 }, (_, i) => ({ id: `forte${i}`, skillLevel: 5 })),
      ...Array.from({ length: 10 }, (_, i) => ({ id: `fraco${i}`, skillLevel: 1 })),
    ];
    const seeds = ["S1", "S2", "S3", "S4", "S5", "S6"];
    const spread = (mode: "RANDOM" | "BALANCED") =>
      seeds.reduce(
        (sum, seed) => sum + balanceTeams({ ...base, players, seed, mode }).strengthSpread,
        0,
      ) / seeds.length;

    expect(spread("BALANCED")).toBeLessThan(spread("RANDOM"));
  });

  it("usa o neutro quando falta nota, sem quebrar", () => {
    const players: BalancePlayer[] = Array.from({ length: 20 }, (_, i) => ({
      id: `p${i}`,
      skillLevel: i < 10 ? null : undefined,
    }));
    const result = balanceTeams({ ...base, players });
    expect(result.strengthSpread).toBe(0);
    expect(allAssigned(result)).toHaveLength(20);
  });

  it("evita repetir as duplas da rodada anterior", () => {
    const players = makePlayers(20, { skillLevel: 3, preferredRole: "VERSATILE" });
    const previousTeams = [
      ["p1", "p2", "p3", "p4", "p5"],
      ["p6", "p7", "p8", "p9", "p10"],
      ["p11", "p12", "p13", "p14", "p15"],
      ["p16", "p17", "p18", "p19", "p20"],
    ];

    const countRepeats = (teams: { playerIds: string[] }[]) =>
      teams.reduce((total, team) => {
        for (let i = 0; i < team.playerIds.length; i++) {
          for (let j = i + 1; j < team.playerIds.length; j++) {
            const a = team.playerIds[i];
            const b = team.playerIds[j];
            const together = previousTeams.some(
              (prev) => prev.includes(a) && prev.includes(b),
            );
            if (together) total += 1;
          }
        }
        return total;
      }, 0);

    const withHistory = balanceTeams({
      ...base,
      players,
      seed: "HISTORICO",
      history: { previousTeams },
    });
    const withoutHistory = balanceTeams({ ...base, players, seed: "HISTORICO" });

    expect(countRepeats(withHistory.teams)).toBeLessThan(
      countRepeats(withoutHistory.teams) + 1,
    );
    expect(countRepeats(withHistory.teams)).toBeLessThanOrEqual(4);
  });
});
