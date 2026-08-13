export type GoalkeeperMode = "FIXED_PER_TEAM" | "POOL" | "ROTATING" | "BORROWED";
export type DrawMode = "RANDOM" | "BALANCED" | "MANUAL";
export type PreferredRole =
  | "GOALKEEPER"
  | "DEFENDER"
  | "MIDFIELDER"
  | "FORWARD"
  | "VERSATILE";

export interface BalancePlayer {
  id: string;
  /** 1–5. Ausente vira o neutro (3) — o balanceador nunca trava por falta de nota. */
  skillLevel?: number | null;
  preferredRole?: PreferredRole | null;
  isGoalkeeper?: boolean;
  /** Índice do time onde o organizador travou o jogador. */
  lockedTeamIndex?: number | null;
}

export interface BalanceWeights {
  skill: number;
  role: number;
  pairRepeat: number;
  previousTeam: number;
}

export interface BalanceHistory {
  /** "playerA|playerB" (ids ordenados) → nº de vezes que caíram juntos. */
  pairCounts?: Record<string, number>;
  /** Times da rodada anterior, como listas de playerId. */
  previousTeams?: string[][];
}

export interface BalanceInput {
  players: BalancePlayer[];
  teamCount: number;
  fieldPlayersPerTeam: number;
  goalkeeperMode: GoalkeeperMode;
  mode: DrawMode;
  seed: string;
  history?: BalanceHistory;
  weights?: Partial<BalanceWeights>;
  /** Quantas combinações testar no modo equilibrado. */
  candidates?: number;
}

export interface BalancedTeam {
  index: number;
  playerIds: string[];
  goalkeeperIds: string[];
  /** Soma de skill dos jogadores de linha — usada no medidor de força. */
  strength: number;
}

export interface BalanceResult {
  teams: BalancedTeam[];
  /** Goleiros mantidos fora dos times (modos POOL e BORROWED). */
  goalkeeperPool: string[];
  /** Jogadores que sobraram além da capacidade dos times. */
  bench: string[];
  mode: DrawMode;
  seed: string;
  /** Custo da distribuição escolhida. Menor é melhor. Sempre 0 no sorteio puro. */
  score: number;
  /** Diferença entre o time mais forte e o mais fraco. */
  strengthSpread: number;
}
