/**
 * Texto pronto pro grupo. O WhatsApp continua sendo o centro social —
 * o app só entrega a mensagem formatada (plano §3.1 e §17).
 */

export const TEAM_EMOJI: Record<string, string> = {
  green: "🟢",
  yellow: "🟡",
  red: "🔴",
  pink: "🩷",
  blue: "🔵",
  orange: "🟠",
  purple: "🟣",
  white: "⚪",
  black: "⚫",
};

export interface ShareTeam {
  name: string;
  color: string;
  goalkeepers: string[];
  players: string[];
}

export interface ShareTeamsInput {
  teams: ShareTeam[];
  venue?: string | null;
  time?: string | null;
  waiting?: string[];
  bench?: string[];
  publicUrl?: string | null;
  groupName?: string | null;
}

const emojiFor = (color: string) => TEAM_EMOJI[color] ?? "⚽";

export function buildTeamsMessage(input: ShareTeamsInput): string {
  const lines: string[] = ["⚽ TIMES DE HOJE", ""];

  for (const team of input.teams) {
    lines.push(`${emojiFor(team.color)} ${team.name.toUpperCase()}`);
    let position = 1;
    for (const goalkeeper of team.goalkeepers) {
      lines.push(`${position}. ${goalkeeper} 🧤`);
      position += 1;
    }
    for (const player of team.players) {
      lines.push(`${position}. ${player}`);
      position += 1;
    }
    lines.push("");
  }

  if (input.bench?.length) {
    lines.push(`🪑 BANCO: ${input.bench.join(", ")}`, "");
  }
  if (input.waiting?.length) {
    lines.push(`⏰ ESPERA: ${input.waiting.join(", ")}`, "");
  }
  if (input.venue) lines.push(`📍 ${input.venue}`);
  if (input.time) lines.push(`🕣 ${input.time}`);
  if (input.venue || input.time) lines.push("");
  if (input.publicUrl) lines.push(input.publicUrl, "");

  lines.push("Times montados no Jogaê.");

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export interface ShareResultInput {
  groupName: string;
  dateText: string;
  matches: Array<{ teamA: string; teamB: string; scoreA: number; scoreB: number }>;
  topScorers?: Array<{ name: string; goals: number }>;
  publicUrl?: string | null;
}

export function buildResultMessage(input: ShareResultInput): string {
  const lines: string[] = [`🏁 ${input.groupName.toUpperCase()} · ${input.dateText}`, ""];

  for (const match of input.matches) {
    const winner =
      match.scoreA === match.scoreB ? "" : match.scoreA > match.scoreB ? " ✅" : "";
    const loser = match.scoreA === match.scoreB ? "" : match.scoreB > match.scoreA ? " ✅" : "";
    lines.push(
      `${match.teamA}${winner} ${match.scoreA} × ${match.scoreB} ${match.teamB}${loser}`,
    );
  }

  if (input.topScorers?.length) {
    lines.push("", "⚽ ARTILHARIA DO DIA");
    input.topScorers.forEach((scorer, i) => {
      lines.push(`${i + 1}. ${scorer.name} — ${scorer.goals}`);
    });
  }

  if (input.publicUrl) lines.push("", input.publicUrl);
  lines.push("", "Registrado no Jogaê.");

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export interface ShareLinkPessoalInput {
  /** Como o grupo chama o cara — apelido ganha do nome de batismo. */
  nome: string;
  groupName: string;
  url: string;
  dateText?: string | null;
  venue?: string | null;
}

/**
 * O convite do link pessoal (bloco I), pra mandar **no privado** de cada um.
 *
 * Não existe versão "pro grupo" de propósito: colar 22 links numa conversa de
 * grupo é entregar a presença de cada um pra todo mundo. A mensagem já diz
 * isso, porque quem recebe é quem vai encaminhar sem pensar.
 */
export function buildLinkPessoalMessage(input: ShareLinkPessoalInput): string {
  const quando = [input.dateText, input.venue].filter(Boolean).join(" · ");
  const lines: string[] = [
    `Fala, ${input.nome}!`,
    "",
    `Agora dá pra confirmar presença no ${input.groupName} sem esperar a lista.`,
  ];

  if (quando) lines.push(`Próxima rodada: ${quando}.`);

  lines.push(
    "",
    'É só abrir e tocar em "Tô dentro" ou "Não vou":',
    input.url,
    "",
    "Esse link é seu e vale sempre — salva aí. Não precisa criar conta nem instalar nada.",
    "Só não repassa pra ninguém: quem abrir responde no seu lugar.",
  );

  return lines.join("\n").trim();
}

export interface ShareRoundCallInput {
  groupName: string;
  dateText: string;
  time?: string | null;
  venue?: string | null;
  confirmed: number;
  capacity: number;
  publicUrl?: string | null;
}

/** Chamada da rodada — "faltam 2 vagas" é uma das mensagens mais usadas no grupo. */
export function buildRoundCallMessage(input: ShareRoundCallInput): string {
  const remaining = Math.max(0, input.capacity - input.confirmed);
  const lines: string[] = [`⚽ ${input.groupName.toUpperCase()} · ${input.dateText}`];

  if (input.time) lines.push(`🕣 ${input.time}`);
  if (input.venue) lines.push(`📍 ${input.venue}`);
  lines.push("");

  if (remaining === 0) {
    lines.push(`${input.confirmed} confirmados. Fechou.`);
  } else if (remaining === 1) {
    lines.push(`${input.confirmed} confirmados. Falta 1 pra fechar.`);
  } else {
    lines.push(`${input.confirmed} confirmados. Faltam ${remaining} pra fechar.`);
  }

  if (input.publicUrl) lines.push("", input.publicUrl);

  return lines.join("\n").trim();
}
