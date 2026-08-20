export type ListSection = "confirmed" | "goalkeepers" | "waiting";

/** Jogador já conhecido do grupo, com apelidos aprendidos. */
export interface KnownPlayer {
  id: string;
  displayName: string;
  nickname?: string | null;
  isGoalkeeper?: boolean;
  /** Aliases já normalizados. */
  aliases: string[];
}

export interface PlayerMatch {
  playerId: string;
  displayName: string;
  /** 0–1. 1 = igualdade exata após normalização. */
  score: number;
}

export interface ParsedEntry {
  /** Posição em `ParseResult.entries` — é o que `ParseWarning.entryIndexes` aponta. */
  index: number;
  /** Linha original, como veio do WhatsApp. */
  raw: string;
  /** Nome limpo, pronto para exibir. */
  name: string;
  normalized: string;
  section: ListSection;
  /** Número que aparecia na linha ("01-Salles" → 1). */
  slot: number | null;
  lineNumber: number;
  /** Match automático — só quando a confiança é total. */
  matchedPlayerId: string | null;
  /** Candidatos para o organizador confirmar na tela de revisão. */
  suggestions: PlayerMatch[];
}

export type WarningCode =
  | "SIMILAR_TO_KNOWN_PLAYER"
  | "DUPLICATE_IN_LIST"
  | "NEW_PLAYER"
  | "EMPTY_SLOT"
  | "NO_GOALKEEPERS"
  | "OVER_CAPACITY"
  | "NO_SECTION_DETECTED"
  | "LINE_TOO_LONG"
  | "LINE_NOT_A_NAME";

export interface ParseWarning {
  code: WarningCode;
  message: string;
  /** Índices em `entries` envolvidos no aviso. */
  entryIndexes: number[];
  /** Opções que o organizador pode escolher, quando o aviso é decidível. */
  options?: PlayerMatch[];
}

export interface ParsedMetadata {
  title: string | null;
  dateText: string | null;
  timeText: string | null;
  venue: string | null;
  venueUrl: string | null;
}

export interface ParseResult {
  metadata: ParsedMetadata;
  entries: ParsedEntry[];
  goalkeepers: ParsedEntry[];
  confirmed: ParsedEntry[];
  waiting: ParsedEntry[];
  warnings: ParseWarning[];
  stats: {
    confirmedCount: number;
    goalkeeperCount: number;
    waitingCount: number;
    emptySlots: number;
    newPlayers: number;
  };
}

export interface GroupContext {
  players: KnownPlayer[];
  /** Capacidade esperada de confirmados; gera aviso quando estourada. */
  capacity?: number;
  /** Abaixo disso vira sugestão, acima vira match automático. */
  autoMatchThreshold?: number;
  suggestThreshold?: number;
}
