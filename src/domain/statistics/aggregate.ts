/**
 * Agregações de estatística. Entrada é sempre dado bruto de partidas e eventos;
 * a regra de negócio não vive em componente React (plano §60).
 */

export interface StatMatch {
  id: string;
  teamAId: string;
  teamBId: string;
  scoreA: number;
  scoreB: number;
  status: "SCHEDULED" | "LIVE" | "FINISHED";
}

export interface StatEvent {
  matchId: string;
  type: "GOAL" | "OWN_GOAL";
  teamId: string;
  playerId: string | null;
  assistPlayerId: string | null;
  voidedAt: Date | string | null;
}

export interface StatRoster {
  /** teamId → ids dos jogadores (linha + goleiro). */
  [teamId: string]: string[];
}

export interface PlayerStats {
  playerId: string;
  goals: number;
  assists: number;
  /** Gols + assistências. */
  contributions: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  /** Vitórias / jogos, 0–1. */
  winRate: number;
}

export interface TeamStats {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

const isLive = (match: StatMatch) => match.status === "FINISHED" || match.status === "LIVE";

export function aggregateTeamStats(matches: StatMatch[]): Map<string, TeamStats> {
  const stats = new Map<string, TeamStats>();

  const ensure = (teamId: string): TeamStats => {
    let entry = stats.get(teamId);
    if (!entry) {
      entry = {
        teamId,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
      };
      stats.set(teamId, entry);
    }
    return entry;
  };

  for (const match of matches) {
    if (match.status !== "FINISHED") continue;
    const a = ensure(match.teamAId);
    const b = ensure(match.teamBId);

    a.played += 1;
    b.played += 1;
    a.goalsFor += match.scoreA;
    a.goalsAgainst += match.scoreB;
    b.goalsFor += match.scoreB;
    b.goalsAgainst += match.scoreA;

    if (match.scoreA > match.scoreB) {
      a.wins += 1;
      b.losses += 1;
      a.points += 3;
    } else if (match.scoreB > match.scoreA) {
      b.wins += 1;
      a.losses += 1;
      b.points += 3;
    } else {
      a.draws += 1;
      b.draws += 1;
      a.points += 1;
      b.points += 1;
    }
  }

  for (const entry of stats.values()) {
    entry.goalDiff = entry.goalsFor - entry.goalsAgainst;
  }

  return stats;
}

export function aggregatePlayerStats(
  matches: StatMatch[],
  events: StatEvent[],
  roster: StatRoster,
): Map<string, PlayerStats> {
  const stats = new Map<string, PlayerStats>();

  const ensure = (playerId: string): PlayerStats => {
    let entry = stats.get(playerId);
    if (!entry) {
      entry = {
        playerId,
        goals: 0,
        assists: 0,
        contributions: 0,
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        winRate: 0,
      };
      stats.set(playerId, entry);
    }
    return entry;
  };

  // Todo jogador escalado aparece no ranking, mesmo sem gol.
  for (const playerIds of Object.values(roster)) {
    for (const playerId of playerIds) ensure(playerId);
  }

  for (const event of events) {
    if (event.voidedAt) continue;
    // Gol contra não conta como gol do autor — conta só no placar do time.
    if (event.type === "GOAL" && event.playerId) {
      const entry = ensure(event.playerId);
      entry.goals += 1;
    }
    if (event.assistPlayerId) {
      const entry = ensure(event.assistPlayerId);
      entry.assists += 1;
    }
  }

  for (const match of matches) {
    if (!isLive(match)) continue;
    const teamAPlayers = roster[match.teamAId] ?? [];
    const teamBPlayers = roster[match.teamBId] ?? [];

    const apply = (playerIds: string[], own: number, other: number) => {
      for (const playerId of playerIds) {
        const entry = ensure(playerId);
        if (match.status !== "FINISHED") continue;
        entry.matchesPlayed += 1;
        if (own > other) entry.wins += 1;
        else if (own < other) entry.losses += 1;
        else entry.draws += 1;
      }
    };

    apply(teamAPlayers, match.scoreA, match.scoreB);
    apply(teamBPlayers, match.scoreB, match.scoreA);
  }

  for (const entry of stats.values()) {
    entry.contributions = entry.goals + entry.assists;
    entry.winRate = entry.matchesPlayed > 0 ? entry.wins / entry.matchesPlayed : 0;
  }

  return stats;
}

export interface Mvp {
  playerId: string;
  goals: number;
  assists: number;
  contributions: number;
  wins: number;
}

/**
 * MVP da rodada: quem mais participou de gol (gol + assistência), com vitória
 * como desempate — no fut de resenha o cara que decidiu o jogo vale mais do que
 * o que fez três num jogo perdido. Empate que sobra não elege ninguém: melhor
 * ficar sem MVP do que coroar por ordem alfabética.
 */
export function mvpDaRodada(stats: Iterable<PlayerStats>): Mvp | null {
  const candidatos = [...stats].filter((entry) => entry.contributions > 0);
  if (candidatos.length === 0) return null;

  candidatos.sort((a, b) => {
    if (b.contributions !== a.contributions) return b.contributions - a.contributions;
    if (b.goals !== a.goals) return b.goals - a.goals;
    return b.wins - a.wins;
  });

  const [primeiro, segundo] = candidatos;
  const empatado =
    segundo &&
    segundo.contributions === primeiro.contributions &&
    segundo.goals === primeiro.goals &&
    segundo.wins === primeiro.wins;
  if (empatado) return null;

  return {
    playerId: primeiro.playerId,
    goals: primeiro.goals,
    assists: primeiro.assists,
    contributions: primeiro.contributions,
    wins: primeiro.wins,
  };
}

export type RankingMetric = "goals" | "assists" | "contributions" | "wins" | "presence";

export interface RankingRow extends PlayerStats {
  position: number;
  presence: number;
}

/** Ordena o ranking com desempate estável e coerente por métrica. */
export function buildRanking(
  stats: Iterable<PlayerStats>,
  metric: RankingMetric,
  presenceByPlayer: Record<string, number> = {},
): RankingRow[] {
  const rows = [...stats].map((entry) => ({
    ...entry,
    position: 0,
    presence: presenceByPlayer[entry.playerId] ?? 0,
  }));

  const value = (row: RankingRow) => (metric === "presence" ? row.presence : row[metric]);

  rows.sort((a, b) => {
    const diff = value(b) - value(a);
    if (diff !== 0) return diff;
    if (b.contributions !== a.contributions) return b.contributions - a.contributions;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return a.playerId.localeCompare(b.playerId);
  });

  // Empate compartilha posição — ninguém é 3º e 4º com o mesmo número.
  let lastValue: number | null = null;
  let lastPosition = 0;
  rows.forEach((row, i) => {
    const current = value(row);
    if (lastValue !== null && current === lastValue) {
      row.position = lastPosition;
    } else {
      row.position = i + 1;
      lastPosition = row.position;
      lastValue = current;
    }
  });

  return rows;
}
