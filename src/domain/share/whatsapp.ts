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
 * Continua sem versão "pro grupo": colar 22 links pessoais numa conversa de
 * grupo é entregar a presença de cada um pra todo mundo, e a mensagem já avisa
 * isso porque quem recebe é quem vai encaminhar sem pensar. O que vai pro grupo
 * é outro texto e outro link — `buildLinkDoGrupoMessage`, que não carrega
 * credencial de ninguém.
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

export interface ShareLinkDoGrupoInput {
  groupName: string;
  url: string;
  dateText?: string | null;
  venue?: string | null;
}

/**
 * O recado do **link de convidado**, esse sim pra colar na conversa do grupo.
 *
 * A diferença pro link pessoal é o que o link entrega: este abre a lista de
 * nomes e pede pra pessoa dizer quem é. Ele não responde presença por conta
 * própria — quem responde é quem toca no nome. Por isso pode circular no grupo,
 * e por isso a mensagem não repete o "não repassa" do outro.
 *
 * O que a mensagem precisa dizer, e diz: que não tem conta, que não tem app pra
 * instalar, e que da segunda vez o link já cai direto na página da pessoa. As
 * três objeções que fazem alguém não clicar.
 */
export function buildLinkDoGrupoMessage(input: ShareLinkDoGrupoInput): string {
  const quando = [input.dateText, input.venue].filter(Boolean).join(" · ");
  const lines: string[] = [
    `⚽ ${input.groupName.toUpperCase()}`,
    "",
    "Agora dá pra confirmar presença direto, sem esperar a lista.",
  ];

  if (quando) lines.push(`Próxima rodada: ${quando}.`);

  lines.push(
    "",
    'Abre o link, toca no seu nome e responde "Tô dentro" ou "Não vou":',
    input.url,
    "",
    "Da próxima vez já cai direto na sua página. Não precisa criar conta nem instalar nada.",
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

export interface ShareConquistaInput {
  groupName: string;
  /** Rótulo da conquista, como o domínio de badges define. */
  conquista: string;
  emoji: string;
  nome: string;
  detalhe: string;
  publicUrl?: string | null;
}

/**
 * O share card de conquista em texto (plano §27).
 *
 * Curto de propósito: é uma mensagem que alguém cola no grupo pra zoar o
 * amigo, não um relatório. O que ela precisa carregar é o nome, o que ele fez
 * e o link — o resto é ruído entre a piada e o clique.
 */
export function buildConquistaMessage(input: ShareConquistaInput): string {
  const lines: string[] = [
    `${input.emoji} ${input.conquista.toUpperCase()}`,
    "",
    `${input.nome} — ${input.detalhe}`,
    `${input.groupName}`,
  ];

  if (input.publicUrl) lines.push("", input.publicUrl);

  return lines.join("\n").trim();
}

export interface ShareCardDoJogadorInput {
  groupName: string;
  nome: string;
  rodadas: number;
  gols: number;
  assistencias: number;
  vitorias: number;
  aproveitamento: number;
  /** Rótulo do melhor recorde, quando existir. */
  recorde?: string | null;
  publicUrl?: string | null;
}

/**
 * O card do jogador em texto.
 *
 * Sem nível técnico, como a tela (plano §13) — e a ausência aqui é mais
 * importante que na tela, porque esta string é feita pra sair do app.
 */
export function buildCardDoJogadorMessage(input: ShareCardDoJogadorInput): string {
  const lines: string[] = [
    `📊 ${input.nome.toUpperCase()} · ${input.groupName}`,
    "",
    `⚽ ${input.gols} ${input.gols === 1 ? "gol" : "gols"}`,
    `👟 ${input.assistencias} ${input.assistencias === 1 ? "assistência" : "assistências"}`,
    `🏆 ${input.vitorias} ${input.vitorias === 1 ? "vitória" : "vitórias"} · ${Math.round(input.aproveitamento * 100)}% de aproveitamento`,
    `📅 ${input.rodadas} ${input.rodadas === 1 ? "rodada" : "rodadas"}`,
  ];

  if (input.recorde) lines.push("", `Recorde: ${input.recorde}`);
  if (input.publicUrl) lines.push("", input.publicUrl);

  return lines.join("\n").trim();
}

export interface ShareRetrospectivaInput {
  groupName: string;
  /** "Janeiro de 2026" ou "2026" — quem sabe de idioma é a tela. */
  periodo: string;
  rodadas: number;
  partidas: number;
  gols: number;
  jogadores: number;
  artilheiros: { nomes: string[]; valor: number };
  garcons: { nomes: string[]; valor: number };
  presencas: { nomes: string[]; valor: number };
  dupla?: { nomes: [string, string]; jogosJuntos: number } | null;
  publicUrl?: string | null;
}

/**
 * A retrospectiva pro grupo.
 *
 * Só superlativo positivo, como o módulo que a calcula: não existe "quem mais
 * faltou" nem "time que mais tomou gol". Destaque vazio (ninguém marcou, ou
 * empatou gente demais) simplesmente não vira linha — melhor uma mensagem curta
 * que uma linha dizendo que ninguém se destacou.
 */
export function buildRetrospectivaMessage(input: ShareRetrospectivaInput): string {
  const lines: string[] = [
    `📅 ${input.groupName.toUpperCase()} · ${input.periodo.toUpperCase()}`,
    "",
    `${input.rodadas} ${input.rodadas === 1 ? "rodada" : "rodadas"} · ${input.partidas} ${input.partidas === 1 ? "jogo" : "jogos"} · ${input.gols} gols`,
    `${input.jogadores} ${input.jogadores === 1 ? "jogador passou" : "jogadores passaram"} por aqui`,
  ];

  const destaques: string[] = [];
  if (input.artilheiros.nomes.length > 0) {
    destaques.push(
      `⚽ Artilharia: ${input.artilheiros.nomes.join(" e ")} (${input.artilheiros.valor})`,
    );
  }
  if (input.garcons.nomes.length > 0) {
    destaques.push(
      `👟 Garçom: ${input.garcons.nomes.join(" e ")} (${input.garcons.valor})`,
    );
  }
  if (input.presencas.nomes.length > 0) {
    destaques.push(
      `🔥 Presença: ${input.presencas.nomes.join(" e ")} (${input.presencas.valor})`,
    );
  }
  if (input.dupla) {
    destaques.push(
      `🤝 Dupla: ${input.dupla.nomes[0]} e ${input.dupla.nomes[1]} (${input.dupla.jogosJuntos} jogos juntos)`,
    );
  }

  if (destaques.length > 0) lines.push("", ...destaques);
  if (input.publicUrl) lines.push("", input.publicUrl);

  return lines.join("\n").trim();
}

export interface ShareConquistasInput {
  groupName: string;
  /** "do mês", "da rodada" — o recorte, escrito pela tela que sabe qual é. */
  recorte: string;
  conquistas: Array<{ emoji: string; rotulo: string; nome: string; detalhe: string }>;
  publicUrl?: string | null;
}

/**
 * Várias conquistas numa mensagem só.
 *
 * Existe além de `buildConquistaMessage` (singular) porque as duas situações
 * são diferentes: uma é "olha o que o Igão fez", pra zoar uma pessoa; esta é o
 * boletim do grupo. Mandar seis mensagens seguidas no lugar desta é o tipo de
 * coisa que faz o pessoal silenciar o grupo.
 */
export function buildConquistasMessage(input: ShareConquistasInput): string {
  if (input.conquistas.length === 0) return "";

  const lines: string[] = [`🏅 CONQUISTAS ${input.recorte.toUpperCase()}`, ""];

  for (const conquista of input.conquistas) {
    lines.push(`${conquista.emoji} ${conquista.rotulo}: ${conquista.nome} — ${conquista.detalhe}`);
  }

  lines.push("", input.groupName);
  if (input.publicUrl) lines.push("", input.publicUrl);

  return lines.join("\n").trim();
}
