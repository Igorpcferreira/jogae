/**
 * PRNG determinístico por seed — sorteio reproduzível é requisito de produto:
 * o organizador precisa poder mostrar que o time saiu do sorteio, não da mão dele.
 */

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  /** Float em [0, 1). */
  next(): number;
  /** Inteiro em [0, max). */
  int(max: number): number;
  /** Cópia embaralhada, sem mutar a entrada. */
  shuffle<T>(items: readonly T[]): T[];
  pick<T>(items: readonly T[]): T;
}

export function createRng(seed: string): Rng {
  const next = mulberry32(xmur3(seed)());

  const rng: Rng = {
    next,
    int: (max) => Math.floor(next() * max),
    shuffle: (items) => {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
    pick: (items) => items[Math.floor(next() * items.length)],
  };

  return rng;
}

/** Seed legível, guardada na rodada para auditoria do sorteio. */
export function generateSeed(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}
