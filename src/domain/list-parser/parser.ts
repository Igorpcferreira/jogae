import { cleanText, normalizeName, similarity, titleCaseName } from "@/domain/text/normalize";
import { MAX_NOME_JOGADOR } from "@/domain/roster/roster";
import type {
  GroupContext,
  KnownPlayer,
  ListSection,
  ParseResult,
  ParseWarning,
  ParsedEntry,
  ParsedMetadata,
  PlayerMatch,
} from "./types";

const DEFAULT_AUTO_MATCH = 0.97;
const DEFAULT_SUGGEST = 0.74;
/** Acima disso, dois nomes na mesma lista viram aviso de possível duplicata. */
const IN_LIST_DUPLICATE = 0.86;

const SECTION_KEYWORDS: Array<{ section: ListSection; re: RegExp }> = [
  { section: "goalkeepers", re: /\b(goleir[oa]s?|goleir[oa]|gk|arqueir[oa]s?)\b/i },
  {
    section: "waiting",
    re: /\b(espera|reservas?|suplentes?|aguardando|fila|banco|lista de espera)\b/i,
  },
  {
    section: "confirmed",
    re: /\b(confirmad[oa]s?|linha|jogadores|titulares|mensalistas|diaristas|jogam)\b/i,
  },
];

/** "01-Salles", "1 - Salles", "1. Salles", "1) Salles", "01 Salles", "01-" */
const NUMBERED_RE = /^(\d{1,3})\s*(?:[-.)\]:º°ª]|\s)\s*(.*)$/;
const BULLET_RE = /^[-*+•·▪]\s*(.*)$/;
/** Prefixo de export do WhatsApp: "[12/09/25 20:31] Salles: texto" ou "12/09/25 20:31 - Salles: texto" */
const WHATSAPP_EXPORT_RE =
  /^\[?\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[APap][Mm])?\]?\s*-?\s*[^:]{1,40}:\s*/;

const TIME_RE = /\b(\d{1,2})\s*(?::|h)\s*(\d{2})\b/;
const TIME_RANGE_RE = /\b(\d{1,2}\s*(?::|h)\s*\d{2})\s*(?:às|as|a|-|–|—|até)\s*(\d{1,2}\s*(?::|h)\s*\d{2})\b/i;
const DATE_RE = /\b(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?\b/;
const WEEKDAY_RE =
  /\b(domingo|segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado)(?:\s*-?\s*feira)?\b/i;
const URL_RE = /\bhttps?:\/\/\S+/i;
const VENUE_RE =
  /\b(arena|campo|quadra|gin[áa]sio|society|complexo|est[áa]dio|cancha|clube|local)\b/i;

/** Linha que é só ruído visual da lista. */
const NOISE_RE = /^(?:[-–—=_.·•*~\s]+|lista|⚽|bola|fut)$/i;

function detectSectionHeader(line: string): ListSection | null {
  // Uma linha numerada nunca é cabeçalho: "01-Goleiro Danilo" é jogador.
  if (NUMBERED_RE.test(line)) return null;
  const bare = line.replace(/[*_~`]/g, "").trim();
  if (!bare || bare.length > 48) return null;
  // Cabeçalho não costuma ter mais de 4 palavras.
  if (bare.split(/\s+/).length > 5) return null;

  for (const { section, re } of SECTION_KEYWORDS) {
    if (re.test(bare)) return section;
  }
  return null;
}

function stripLinePrefix(line: string): { slot: number | null; rest: string } {
  const numbered = line.match(NUMBERED_RE);
  if (numbered) {
    return { slot: Number(numbered[1]), rest: numbered[2].trim() };
  }
  const bullet = line.match(BULLET_RE);
  if (bullet) return { slot: null, rest: bullet[1].trim() };
  return { slot: null, rest: line };
}

function buildMatchIndex(players: KnownPlayer[]) {
  const exact = new Map<string, KnownPlayer>();
  const candidates: Array<{ key: string; player: KnownPlayer }> = [];

  for (const player of players) {
    const keys = new Set<string>([
      normalizeName(player.displayName),
      ...(player.nickname ? [normalizeName(player.nickname)] : []),
      ...player.aliases.map(normalizeName),
    ]);
    for (const key of keys) {
      if (!key) continue;
      if (!exact.has(key)) exact.set(key, player);
      candidates.push({ key, player });
    }
  }
  return { exact, candidates };
}

function findMatches(
  normalized: string,
  index: ReturnType<typeof buildMatchIndex>,
  suggestThreshold: number,
): PlayerMatch[] {
  const best = new Map<string, PlayerMatch>();

  for (const { key, player } of index.candidates) {
    const score = similarity(normalized, key);
    if (score < suggestThreshold) continue;
    const current = best.get(player.id);
    if (!current || score > current.score) {
      best.set(player.id, { playerId: player.id, displayName: player.displayName, score });
    }
  }

  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, 3);
}

function extractMetadata(lines: string[]): ParsedMetadata {
  const metadata: ParsedMetadata = {
    title: null,
    dateText: null,
    timeText: null,
    venue: null,
    venueUrl: null,
  };

  for (const line of lines) {
    if (!metadata.venueUrl) {
      const url = line.match(URL_RE);
      if (url) metadata.venueUrl = url[0];
    }
    if (!metadata.timeText) {
      const range = line.match(TIME_RANGE_RE);
      if (range) {
        metadata.timeText = `${range[1].replace(/\s|h/g, ":").replace(/::/, ":")}–${range[2]
          .replace(/\s|h/g, ":")
          .replace(/::/, ":")}`;
      } else {
        const time = line.match(TIME_RE);
        if (time) metadata.timeText = `${time[1].padStart(2, "0")}:${time[2]}`;
      }
    }
    if (!metadata.dateText) {
      const date = line.match(DATE_RE);
      if (date) {
        metadata.dateText = date[3]
          ? `${date[1].padStart(2, "0")}/${date[2].padStart(2, "0")}/${date[3]}`
          : `${date[1].padStart(2, "0")}/${date[2].padStart(2, "0")}`;
      } else {
        const weekday = line.match(WEEKDAY_RE);
        if (weekday) metadata.dateText = titleCaseName(weekday[1]);
      }
    }
    if (!metadata.venue && VENUE_RE.test(line) && !NUMBERED_RE.test(line)) {
      const venue = line.replace(/^local\s*:?\s*/i, "").replace(URL_RE, "").trim();
      if (venue && venue.length <= 80) metadata.venue = venue;
    }
  }

  // Título: primeira linha com conteúdo que não seja seção nem jogador numerado.
  for (const line of lines) {
    if (!line || NUMBERED_RE.test(line) || detectSectionHeader(line)) continue;
    if (URL_RE.test(line) || NOISE_RE.test(line)) continue;
    if (line === metadata.venue) continue;
    metadata.title = line.replace(/[*_~`]/g, "").trim();
    break;
  }

  return metadata;
}

/**
 * Transforma o texto colado do WhatsApp em estrutura normalizada.
 *
 * O parser nunca decide sozinho em caso de dúvida — ele devolve warnings
 * com opções para a tela de revisão resolver (plano §12).
 */
export function parseList(rawText: string, context: GroupContext = { players: [] }): ParseResult {
  const autoMatchThreshold = context.autoMatchThreshold ?? DEFAULT_AUTO_MATCH;
  const suggestThreshold = context.suggestThreshold ?? DEFAULT_SUGGEST;
  const index = buildMatchIndex(context.players);

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => cleanText(line.replace(WHATSAPP_EXPORT_RE, "")));

  const metadata = extractMetadata(lines);

  const entries: ParsedEntry[] = [];
  const warnings: ParseWarning[] = [];
  let emptySlots = 0;

  let section: ListSection = "confirmed";
  let explicitSection = false;
  let slotsInSection = 0;

  lines.forEach((line, i) => {
    if (!line) return;

    const header = detectSectionHeader(line);
    if (header) {
      section = header;
      explicitSection = true;
      slotsInSection = 0;
      return;
    }

    const { slot, rest } = stripLinePrefix(line);

    // "01-" sem nome é vaga em aberto, não jogador.
    if (slot !== null && !rest) {
      emptySlots += 1;
      slotsInSection += 1;
      return;
    }

    // Caso real do WhatsApp: a seção de goleiros termina sem cabeçalho e a
    // numeração recomeça do 01 na lista de linha.
    if (section === "goalkeepers" && slot === 1 && slotsInSection > 0) {
      section = "confirmed";
      slotsInSection = 0;
    }

    // Sem numeração e sem seção explícita, só aceitamos linhas que pareçam nome.
    if (slot === null && !explicitSection && entries.length === 0) {
      if (line === metadata.title || line === metadata.venue) return;
      if (URL_RE.test(line) || DATE_RE.test(line) || TIME_RE.test(line)) return;
    }

    const name = titleCaseName(rest);
    const normalized = normalizeName(rest);
    if (!normalized || NOISE_RE.test(normalized)) return;

    // Avisos de lista ("lista fecha com...", links e instruções) às vezes
    // vêm no meio dos nomes. Acima do limite do elenco não é um jogador válido.
    if (name.length > MAX_NOME_JOGADOR) {
      warnings.push({
        code: "LINE_TOO_LONG",
        message: `Ignorei uma linha com mais de ${MAX_NOME_JOGADOR} caracteres: ela não parece nome de jogador.`,
        entryIndexes: [],
      });
      return;
    }

    if (slot !== null) slotsInSection += 1;

    const suggestions = findMatches(normalized, index, suggestThreshold);
    const exact = index.exact.get(normalized);
    const best = suggestions[0];

    const matchedPlayerId = exact
      ? exact.id
      : best && best.score >= autoMatchThreshold
        ? best.playerId
        : null;

    entries.push({
      index: entries.length,
      raw: line,
      name,
      normalized,
      section,
      slot,
      lineNumber: i + 1,
      matchedPlayerId,
      suggestions: matchedPlayerId ? [] : suggestions,
    });
  });

  // ── Avisos ────────────────────────────────────────────────

  for (const entry of entries) {
    if (entry.matchedPlayerId || entry.suggestions.length === 0) continue;
    warnings.push({
      code: "SIMILAR_TO_KNOWN_PLAYER",
      message: `“${entry.name}” pode ser ${entry.suggestions
        .map((s) => `“${s.displayName}”`)
        .join(" ou ")}.`,
      entryIndexes: [entry.index],
      options: entry.suggestions,
    });
  }

  const newPlayers = entries.filter(
    (entry) => !entry.matchedPlayerId && entry.suggestions.length === 0,
  );
  if (newPlayers.length > 0) {
    warnings.push({
      code: "NEW_PLAYER",
      message:
        newPlayers.length === 1
          ? `“${newPlayers[0].name}” ainda não está no grupo.`
          : `${newPlayers.length} nomes ainda não estão no grupo.`,
      entryIndexes: newPlayers.map((entry) => entry.index),
    });
  }

  // Duplicatas dentro da própria lista.
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      const sameMatch =
        a.matchedPlayerId !== null && a.matchedPlayerId === b.matchedPlayerId;
      const score = similarity(a.normalized, b.normalized);
      if (!sameMatch && score < IN_LIST_DUPLICATE) continue;
      warnings.push({
        code: "DUPLICATE_IN_LIST",
        message:
          a.normalized === b.normalized || sameMatch
            ? `“${a.name}” aparece duas vezes.`
            : `“${a.name}” e “${b.name}” podem ser a mesma pessoa.`,
        entryIndexes: [a.index, b.index],
      });
    }
  }

  if (emptySlots > 0) {
    warnings.push({
      code: "EMPTY_SLOT",
      message: emptySlots === 1 ? "1 vaga em branco na lista." : `${emptySlots} vagas em branco.`,
      entryIndexes: [],
    });
  }

  const goalkeepers = entries.filter((entry) => entry.section === "goalkeepers");
  const confirmed = entries.filter((entry) => entry.section === "confirmed");
  const waiting = entries.filter((entry) => entry.section === "waiting");

  if (goalkeepers.length === 0) {
    warnings.push({
      code: "NO_GOALKEEPERS",
      message: "Nenhum goleiro confirmado.",
      entryIndexes: [],
    });
  }

  if (context.capacity && confirmed.length > context.capacity) {
    warnings.push({
      code: "OVER_CAPACITY",
      message: `${confirmed.length} confirmados para ${context.capacity} vagas.`,
      entryIndexes: [],
    });
  }

  if (!explicitSection && entries.length > 0) {
    warnings.push({
      code: "NO_SECTION_DETECTED",
      message: "Não achei separação de goleiros e espera — tudo entrou como confirmado.",
      entryIndexes: [],
    });
  }

  return {
    metadata,
    entries,
    goalkeepers,
    confirmed,
    waiting,
    warnings,
    stats: {
      confirmedCount: confirmed.length,
      goalkeeperCount: goalkeepers.length,
      waitingCount: waiting.length,
      emptySlots,
      newPlayers: newPlayers.length,
    },
  };
}
