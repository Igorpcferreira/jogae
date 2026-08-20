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

/** Chavões de recado que aparecem no meio das listas e não são nome de ninguém. */
const BOILERPLATE_RE =
  /\b(aten[cç][aã]o|obs|observa[cç][aã]o|localiza[cç][aã]o|endere[cç]o|lista\s+(?:fecha|de)|importante|aviso|regras?|pagamento|mensalidade|pix|pontualidade|levar|trazer|colete|proibido|furar|paga(?:r|m)?|confirmar|chegar|chegue|quem)\b/i;

/**
 * Por que esta linha **não** é nome de jogador — ou `null` quando parece nome.
 *
 * Existe porque cabeçalho de lista real ("Toda QUINTA 20:30 às 22:00",
 * "Local Campo 03 - Farofa", "LISTA FECHA COM 20") virou jogador em produção:
 * o filtro antigo só rodava antes do primeiro nome e sem seção explícita.
 * Aqui a checagem vale pra toda linha candidata, e quem chama decide a exceção
 * (nome que o organizador já cadastrou passa mesmo com número — "CR7" é
 * escolha dele, e o match exato prova que é gente).
 *
 * Também é o critério do script que caça jogador-fantasma no banco
 * (`scripts/limpar-jogadores-fantasma.ts`) — mudou aqui, mudou lá.
 */
export function motivoNaoNome(texto: string): string | null {
  const limpo = cleanText(texto);
  if (!limpo) return null;
  if (URL_RE.test(limpo) || /\bwww\./i.test(limpo)) return "um link";
  if (TIME_RE.test(limpo) || DATE_RE.test(limpo) || WEEKDAY_RE.test(limpo)) {
    return "data ou horário";
  }
  if (limpo.includes(":")) return "um recado";
  if (BOILERPLATE_RE.test(limpo)) return "recado da lista";
  // "Campo 03 - Farofa" numa linha própria é o local do jogo, não gente.
  // Não existe regra por dígito de propósito: "Zé 10", "CR7" e "Jogador 2"
  // são nomes legítimos, e quem decide isso é o organizador na revisão.
  if (VENUE_RE.test(limpo)) return "o local do jogo";
  return null;
}

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
  // "20:30 em ponto": o que parece numeração ("20:") é horário. Deixa a linha
  // inteira pro filtro de nome enxergar o "20:30" — senão o recado vira o
  // jogador "30 Em Ponto" no slot 20.
  if (/^\d{1,2}\s*[:h]\s*\d{2}\b/i.test(line)) return { slot: null, rest: line };
  const numbered = line.match(NUMBERED_RE);
  if (numbered) {
    return { slot: Number(numbered[1]), rest: numbered[2].trim() };
  }
  const bullet = line.match(BULLET_RE);
  if (bullet) return { slot: null, rest: bullet[1].trim() };
  return { slot: null, rest: line };
}

/**
 * "Goleiro: Danilo" — rótulo de seção com o nome na mesma linha. O cabeçalho
 * consome só até o ":"; o que vem depois continua vivo como candidato a nome.
 * Sem isto o Danilo sumia em silêncio e os numerados seguintes viravam goleiro.
 */
function nomeAposCabecalho(line: string): string | null {
  const separador = line.indexOf(":");
  if (separador === -1) return null;
  const rotulo = line.slice(0, separador);
  if (!SECTION_KEYWORDS.some(({ re }) => re.test(rotulo))) return null;
  const resto = line.slice(separador + 1).trim();
  return resto || null;
}

/**
 * "Carlão pix ✔️" e "Rafa chega 21h15": anotação colada num nome que o grupo
 * já conhece. A linha é da pessoa — descartá-la sumiria com presença de gente
 * de verdade. Só vale quando o começo casa com **um** jogador; prefixo ambíguo
 * não decide por ninguém.
 */
function jogadorPorPrefixo(
  normalized: string,
  index: ReturnType<typeof buildMatchIndex>,
): KnownPlayer | null {
  let achado: KnownPlayer | null = null;
  for (const { key, player } of index.candidates) {
    if (key !== normalized && !normalized.startsWith(`${key} `)) continue;
    if (achado && achado.id !== player.id) return null;
    achado = player;
  }
  return achado;
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
    // Cabeçalho de seção não é local: "CAMPO CONFIRMADO!" tem "campo" e já
    // virou venue de rodada em produção.
    if (
      !metadata.venue &&
      VENUE_RE.test(line) &&
      !NUMBERED_RE.test(line) &&
      !detectSectionHeader(line)
    ) {
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

  lines.forEach((linhaOriginal, i) => {
    let line = linhaOriginal;
    if (!line) return;

    const header = detectSectionHeader(line);
    if (header) {
      section = header;
      explicitSection = true;
      slotsInSection = 0;
      // "Goleiro: Danilo" — o rótulo vira seção e o nome segue no fluxo.
      const resto = nomeAposCabecalho(line);
      if (!resto) return;
      line = resto;
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

    // Linha que não parece nome de gente (link, horário, recado) não vira
    // jogador — foi assim que "Lista Fecha Com 20" entrou num elenco de
    // produção. Duas exceções, e as duas são "o organizador já conhece":
    // match exato no elenco passa sempre ("CR7" é escolha dele), e anotação
    // colada num nome conhecido ("Carlão pix ✔️") é presença do conhecido.
    let resgate: KnownPlayer | null = null;
    if (!index.exact.has(normalized)) {
      const motivo = motivoNaoNome(rest);
      if (motivo) {
        resgate = jogadorPorPrefixo(normalized, index);
        if (!resgate) {
          warnings.push({
            code: "LINE_NOT_A_NAME",
            message: `Ignorei “${name}”: parece ${motivo}, não nome de jogador.`,
            entryIndexes: [],
          });
          return;
        }
      }
    }

    // Conta qualquer entrada, numerada ou não: é o que deixa "Goleiro: Danilo"
    // seguido de "01-..." devolver a numeração pra lista de linha.
    slotsInSection += 1;

    const suggestions = findMatches(normalized, index, suggestThreshold);
    const exact = index.exact.get(normalized);
    const best = suggestions[0];

    const matchedPlayerId = exact
      ? exact.id
      : resgate
        ? resgate.id
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
