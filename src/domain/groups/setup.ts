// Criação de grupo (plano §9). Puro: nenhum acesso a banco, nenhum React.
// O onboarding só faz três perguntas de verdade — o resto vem de default por
// modalidade e o organizador ajusta se quiser.

import { normalizeName } from "@/domain/text/normalize";

export type Modalidade = "SOCIETY" | "FUTSAL" | "CAMPO" | "CUSTOM";
export type ModoGoleiro = "FIXED_PER_TEAM" | "POOL" | "ROTATING" | "BORROWED";

export interface FormatoDoFut {
  teamCount: number;
  fieldPlayersPerTeam: number;
  goalkeepersPerTeam: number;
  goalkeeperMode: ModoGoleiro;
  defaultDurationMin: number;
}

/**
 * Defaults por modalidade. Society de 7 (6 na linha + goleiro) com 4 times é o
 * formato mais comum de fut de quinta; futsal roda com 3 times porque a quadra
 * é menor; campo raramente tem mais de 2 times.
 */
export const PADRAO_POR_MODALIDADE: Record<Modalidade, FormatoDoFut> = {
  SOCIETY: {
    teamCount: 4,
    fieldPlayersPerTeam: 6,
    goalkeepersPerTeam: 1,
    goalkeeperMode: "FIXED_PER_TEAM",
    defaultDurationMin: 90,
  },
  FUTSAL: {
    teamCount: 3,
    fieldPlayersPerTeam: 4,
    goalkeepersPerTeam: 1,
    goalkeeperMode: "FIXED_PER_TEAM",
    defaultDurationMin: 60,
  },
  CAMPO: {
    teamCount: 2,
    fieldPlayersPerTeam: 10,
    goalkeepersPerTeam: 1,
    goalkeeperMode: "FIXED_PER_TEAM",
    defaultDurationMin: 90,
  },
  CUSTOM: {
    teamCount: 2,
    fieldPlayersPerTeam: 5,
    goalkeepersPerTeam: 1,
    goalkeeperMode: "ROTATING",
    defaultDurationMin: 60,
  },
};

export const ROTULO_MODALIDADE: Record<Modalidade, string> = {
  SOCIETY: "Society",
  FUTSAL: "Futsal",
  CAMPO: "Campo",
  CUSTOM: "Do nosso jeito",
};

export const ROTULO_MODO_GOLEIRO: Record<ModoGoleiro, string> = {
  FIXED_PER_TEAM: "Fixo por time",
  POOL: "Pool de goleiros",
  ROTATING: "Revezamento",
  BORROWED: "Emprestado de quem descansa",
};

export const DICA_MODO_GOLEIRO: Record<ModoGoleiro, string> = {
  FIXED_PER_TEAM: "Cada time começa com o seu goleiro.",
  POOL: "Os goleiros são distribuídos partida a partida.",
  ROTATING: "Não tem goleiro fixo — a galera reveza.",
  BORROWED: "Quem está de fora empresta o goleiro.",
};

/* ── Limites ───────────────────────────────────────────────── */

export const LIMITES = {
  teamCount: { min: 2, max: 8 },
  fieldPlayersPerTeam: { min: 2, max: 11 },
  goalkeepersPerTeam: { min: 0, max: 2 },
} as const;

/** Quantos cabem na rodada: times × (linha + gol). */
export function capacidadeDoFormato(formato: {
  teamCount: number;
  fieldPlayersPerTeam: number;
  goalkeepersPerTeam: number;
}): number {
  return (
    formato.teamCount * (formato.fieldPlayersPerTeam + formato.goalkeepersPerTeam)
  );
}

/**
 * Modo de goleiro sem goleiro dedicado força `goalkeepersPerTeam = 0` — senão a
 * capacidade cobraria vaga de gente que não existe.
 */
export function normalizarFormato(formato: FormatoDoFut): FormatoDoFut {
  const limitar = (valor: number, faixa: { min: number; max: number }) =>
    Math.min(faixa.max, Math.max(faixa.min, Math.round(valor)));

  const goleirosPorTime =
    formato.goalkeeperMode === "ROTATING"
      ? 0
      : limitar(formato.goalkeepersPerTeam, LIMITES.goalkeepersPerTeam);

  return {
    ...formato,
    teamCount: limitar(formato.teamCount, LIMITES.teamCount),
    fieldPlayersPerTeam: limitar(formato.fieldPlayersPerTeam, LIMITES.fieldPlayersPerTeam),
    goalkeepersPerTeam: goleirosPorTime,
    defaultDurationMin: Math.min(240, Math.max(20, Math.round(formato.defaultDurationMin))),
  };
}

/* ── Slug ──────────────────────────────────────────────────── */

/** Rotas reservadas: nenhum grupo pode ocupar um caminho da aplicação. */
const SLUGS_RESERVADOS = new Set([
  "novo",
  "entrar",
  "sair",
  "api",
  "g",
  "r",
  "admin",
  "sobre",
  "ajuda",
]);

/** "Fut da Quinta ⚽" → "fut-da-quinta". Nunca vazio: cai em "fut". */
export function gerarSlug(nome: string): string {
  const base = normalizeName(nome)
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
    .replace(/-$/, "");

  return base || "fut";
}

/**
 * Primeiro slug livre a partir do nome. Sufixo numérico só entra quando
 * precisa — "fut-da-quinta" antes de "fut-da-quinta-2".
 */
export function slugDisponivel(nome: string, ocupados: Iterable<string>): string {
  const base = gerarSlug(nome);
  const usados = new Set(ocupados);

  if (!usados.has(base) && !SLUGS_RESERVADOS.has(base)) return base;

  for (let sufixo = 2; sufixo < 1000; sufixo++) {
    const candidato = `${base}-${sufixo}`;
    if (!usados.has(candidato)) return candidato;
  }
  // Improvável na prática; melhor um slug feio do que um erro na cara do usuário.
  return `${base}-${Date.now().toString(36)}`;
}

/** Candidatos a consultar no banco de uma vez só, evitando ida e volta. */
export function candidatosDeSlug(nome: string, quantidade = 12): string[] {
  const base = gerarSlug(nome);
  return [base, ...Array.from({ length: quantidade - 1 }, (_, i) => `${base}-${i + 2}`)];
}

/* ── Nome do grupo ─────────────────────────────────────────── */

export function nomeDeGrupoValido(nome: string): boolean {
  const limpo = nome.trim();
  return limpo.length >= 2 && limpo.length <= 60;
}
