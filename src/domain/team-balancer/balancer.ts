import { createRng } from "@/domain/random/seeded";
import type {
  BalanceInput,
  BalancePlayer,
  BalanceResult,
  BalanceWeights,
  BalancedTeam,
} from "./types";

const NEUTRAL_SKILL = 3;

export const DEFAULT_WEIGHTS: BalanceWeights = {
  skill: 1,
  role: 0.6,
  pairRepeat: 0.35,
  previousTeam: 0.5,
};

const skillOf = (player: BalancePlayer) =>
  typeof player.skillLevel === "number" && player.skillLevel > 0
    ? player.skillLevel
    : NEUTRAL_SKILL;

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Times que o jogador dividiu na rodada anterior, achatados em pares. */
function previousPairs(previousTeams: string[][] = []): Set<string> {
  const pairs = new Set<string>();
  for (const team of previousTeams) {
    for (let i = 0; i < team.length; i++) {
      for (let j = i + 1; j < team.length; j++) {
        pairs.add(pairKey(team[i], team[j]));
      }
    }
  }
  return pairs;
}

interface Assignment {
  /** teams[i] = ids dos jogadores de linha do time i. */
  teams: string[][];
  bench: string[];
}

/**
 * Distribui jogadores em times respeitando locks e capacidade.
 * `order` define a prioridade; a distribuição em si é serpentina
 * (1-2-3-4-4-3-2-1), que já reduz muito a discrepância.
 */
function deal(
  order: BalancePlayer[],
  teamCount: number,
  capacity: number,
  snake: boolean,
): Assignment {
  const teams: string[][] = Array.from({ length: teamCount }, () => []);
  const bench: string[] = [];

  const locked = order.filter(
    (p) => p.lockedTeamIndex !== null && p.lockedTeamIndex !== undefined,
  );
  const free = order.filter(
    (p) => p.lockedTeamIndex === null || p.lockedTeamIndex === undefined,
  );

  for (const player of locked) {
    const index = player.lockedTeamIndex!;
    if (index >= 0 && index < teamCount && teams[index].length < capacity) {
      teams[index].push(player.id);
    } else {
      free.unshift(player);
    }
  }

  let cursor = 0;
  for (const player of free) {
    // Ordem serpentina sobre os times com vaga.
    let placed = false;
    for (let attempt = 0; attempt < teamCount; attempt++) {
      const round = Math.floor(cursor / teamCount);
      const step = cursor % teamCount;
      const index = snake && round % 2 === 1 ? teamCount - 1 - step : step;
      cursor++;
      if (teams[index].length < capacity) {
        teams[index].push(player.id);
        placed = true;
        break;
      }
    }
    if (!placed) bench.push(player.id);
  }

  return { teams, bench };
}

function scoreAssignment(
  assignment: Assignment,
  byId: Map<string, BalancePlayer>,
  weights: BalanceWeights,
  pairCounts: Record<string, number>,
  prevPairs: Set<string>,
): number {
  const strengths = assignment.teams.map((team) =>
    team.reduce((sum, id) => sum + skillOf(byId.get(id)!), 0),
  );
  const skillSpread = strengths.length ? Math.max(...strengths) - Math.min(...strengths) : 0;

  // Desequilíbrio de perfis: quanto cada time se afasta da média por função.
  const roles = ["DEFENDER", "MIDFIELDER", "FORWARD"] as const;
  let roleImbalance = 0;
  for (const role of roles) {
    const counts = assignment.teams.map(
      (team) => team.filter((id) => byId.get(id)?.preferredRole === role).length,
    );
    const mean = counts.reduce((a, b) => a + b, 0) / (counts.length || 1);
    roleImbalance += counts.reduce((sum, c) => sum + Math.abs(c - mean), 0);
  }

  let pairRepeat = 0;
  let previousTeamRepeat = 0;
  for (const team of assignment.teams) {
    for (let i = 0; i < team.length; i++) {
      for (let j = i + 1; j < team.length; j++) {
        const key = pairKey(team[i], team[j]);
        pairRepeat += pairCounts[key] ?? 0;
        if (prevPairs.has(key)) previousTeamRepeat += 1;
      }
    }
  }

  return (
    skillSpread * weights.skill +
    roleImbalance * weights.role +
    pairRepeat * weights.pairRepeat +
    previousTeamRepeat * weights.previousTeam
  );
}

/**
 * Monta os times da rodada.
 *
 * Garantias (cobertas por teste): nenhum jogador é perdido, nenhum é duplicado,
 * locks são respeitados, e a mesma seed sempre produz o mesmo resultado.
 */
export function balanceTeams(input: BalanceInput): BalanceResult {
  const {
    players,
    teamCount,
    fieldPlayersPerTeam,
    goalkeeperMode,
    mode,
    seed,
    history,
    candidates = 240,
  } = input;

  if (teamCount < 1) throw new Error("teamCount precisa ser ao menos 1");
  if (fieldPlayersPerTeam < 1) throw new Error("fieldPlayersPerTeam precisa ser ao menos 1");

  const weights = { ...DEFAULT_WEIGHTS, ...input.weights };
  const rng = createRng(seed);
  const byId = new Map(players.map((p) => [p.id, p]));

  // ── Goleiros ────────────────────────────────────────────────
  const goalkeepers = players.filter((p) => p.isGoalkeeper);
  const fieldCandidates = players.filter((p) => !p.isGoalkeeper);

  const teamGoalkeepers: string[][] = Array.from({ length: teamCount }, () => []);
  let goalkeeperPool: string[] = [];
  let fieldPlayers = fieldCandidates;

  if (goalkeeperMode === "FIXED_PER_TEAM") {
    // Goleiros travados vão para o time do lock; o resto é sorteado.
    const lockedGks = goalkeepers.filter(
      (p) => p.lockedTeamIndex !== null && p.lockedTeamIndex !== undefined,
    );
    const freeGks = rng.shuffle(
      goalkeepers.filter((p) => p.lockedTeamIndex === null || p.lockedTeamIndex === undefined),
    );

    for (const gk of lockedGks) {
      const index = gk.lockedTeamIndex!;
      if (index >= 0 && index < teamCount && teamGoalkeepers[index].length === 0) {
        teamGoalkeepers[index].push(gk.id);
      } else {
        freeGks.unshift(gk);
      }
    }
    for (let i = 0; i < teamCount; i++) {
      if (teamGoalkeepers[i].length === 0 && freeGks.length > 0) {
        teamGoalkeepers[i].push(freeGks.shift()!.id);
      }
    }
    // Goleiro que sobrou joga na linha.
    fieldPlayers = [...fieldCandidates, ...freeGks];
  } else if (goalkeeperMode === "ROTATING") {
    fieldPlayers = players;
  } else {
    // POOL e BORROWED: goleiro fica fora dos times.
    goalkeeperPool = goalkeepers.map((p) => p.id);
  }

  // ── Jogadores de linha ──────────────────────────────────────
  let best: Assignment | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  if (mode === "BALANCED") {
    const pairCounts = history?.pairCounts ?? {};
    const prevPairs = previousPairs(history?.previousTeams);

    for (let i = 0; i < candidates; i++) {
      // Ordena por skill com ruído: mantém a serpentina eficaz sem virar sempre igual.
      const noisy = rng
        .shuffle(fieldPlayers)
        .map((player) => ({ player, key: skillOf(player) + rng.next() * 0.9 }))
        .sort((a, b) => b.key - a.key)
        .map((item) => item.player);

      const assignment = deal(noisy, teamCount, fieldPlayersPerTeam, true);
      const score = scoreAssignment(assignment, byId, weights, pairCounts, prevPairs);
      if (score < bestScore) {
        bestScore = score;
        best = assignment;
      }
      if (score === 0) break;
    }
  } else {
    best = deal(rng.shuffle(fieldPlayers), teamCount, fieldPlayersPerTeam, false);
    bestScore = 0;
  }

  const assignment = best!;

  const teams: BalancedTeam[] = assignment.teams.map((playerIds, index) => ({
    index,
    playerIds,
    goalkeeperIds: teamGoalkeepers[index],
    strength: playerIds.reduce((sum, id) => sum + skillOf(byId.get(id)!), 0),
  }));

  const strengths = teams.map((team) => team.strength);
  const strengthSpread = strengths.length
    ? Math.max(...strengths) - Math.min(...strengths)
    : 0;

  return {
    teams,
    goalkeeperPool,
    bench: assignment.bench,
    mode,
    seed,
    score: mode === "BALANCED" ? Number(bestScore.toFixed(3)) : 0,
    strengthSpread,
  };
}
