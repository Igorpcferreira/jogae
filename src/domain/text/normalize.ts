/**
 * Normalização de nomes — base para alias, deduplicação e fuzzy matching.
 *
 * Regra do produto: o parser nunca "inventa" silenciosamente. A normalização
 * existe só para comparar; o texto original do jogador é sempre preservado.
 */

/** Faixas de emoji e símbolos que aparecem em lista de WhatsApp. */
const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;

/** Variações de traço/hífen que o WhatsApp e os teclados produzem. */
const DASHES = /[‐‑‒–—―−]/g;

/** Espaços exóticos (NBSP, narrow NBSP, zero-width). */
const SPACES = /[  -   　]/g;
const ZERO_WIDTH = /[​‌‎‏﻿]/g;

/** Remove emojis, zero-width e normaliza espaços/traços — preservando acentos. */
export function cleanText(input: string): string {
  return input
    .replace(ZERO_WIDTH, "")
    .replace(EMOJI_RE, " ")
    .replace(SPACES, " ")
    .replace(DASHES, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Forma canônica usada para comparar dois nomes.
 * "Marcos Manus" · "marcos  manus" · "MARCOS MANÚS" → "marcos manus"
 */
export function normalizeName(input: string): string {
  return cleanText(input)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // pontuação vira separador
    .replace(/\s+/g, " ")
    .trim();
}

/** Capitaliza para exibição, respeitando partículas do português. */
const LOWERCASE_PARTICLES = new Set(["de", "da", "do", "das", "dos", "e", "di", "du"]);

export function titleCaseName(input: string): string {
  const cleaned = cleanText(input);
  if (!cleaned) return "";
  // Nome já digitado com capitalização mista intencional (ex.: "McSalles") fica como está.
  if (/[a-zà-ÿ][A-ZÀ-Þ]/.test(cleaned)) return cleaned;

  return cleaned
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((word, index) => {
      if (index > 0 && LOWERCASE_PARTICLES.has(word)) return word;
      return word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1);
    })
    .join(" ");
}

/** Distância de Levenshtein com early-exit por limite. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  let current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    const charA = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j++) {
      const cost = charA === b.charCodeAt(j - 1) ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    [previous, current] = [current, previous];
  }
  return previous[b.length];
}

/** Similaridade 0–1 entre dois nomes já normalizados. */
export function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b) return 1;

  const base = 1 - levenshtein(a, b) / Math.max(a.length, b.length);

  // "igor" dentro de "igor de castro" é um sinal forte que a distância bruta perde.
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (long.split(" ").includes(short)) return Math.max(base, 0.9);
  if (long.startsWith(short + " ")) return Math.max(base, 0.88);

  return base;
}
