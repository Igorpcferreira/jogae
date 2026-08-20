// Votação de craque — a "Escolha da galera" (plano §27).
//
// Por que votar, se o craque já é calculado: `mvpDaRodada` decide por
// participação em gol, e isso **exclui goleiro e zagueiro por construção**.
// Quem fez dez defesas nunca vai aparecer numa conta de gol + assistência. A
// votação não corrige um erro do cálculo, corrige um limite dele — por isso os
// dois prêmios convivem, com nomes diferentes, em vez de um substituir o outro.
//
// O risco que o plano manda evitar ("mecânicas que gerem conflito") é a
// votação virar concurso de popularidade e, pior, virar discussão de
// segunda-feira sobre quem votou em quem. As regras abaixo existem cada uma
// contra um pedaço desse risco:
//
// - **só vota quem jogou** — quem não estava lá não tem o que julgar;
// - **não pode votar em si** — o resto se resolve sozinho;
// - **voto secreto**: esta camada nunca devolve o par votante→votado, e a
//   apuração só entrega o vencedor. É a regra que mais separa prêmio de briga;
// - **quórum**: dois votos não coroam ninguém;
// - **empate divide**, como todas as conquistas — e empate de gente demais não
//   elege ninguém, pelo mesmo motivo do resto do módulo de badges;
// - **janela curta**: abre no apito final e fecha em 48h, pra ninguém abrir uma
//   campanha no meio da semana.
//
// Puro: quem sabe de banco, cookie e link pessoal é a camada de cima.

/** Horas de votação depois do apito final. Dois dias cobre o fim de semana. */
export const HORAS_DE_VOTACAO = 48;

/** Voto mínimo em número absoluto, pra rodada pequena não eleger com 2. */
export const QUORUM_ABSOLUTO = 3;

/** E, além disso, pelo menos um terço de quem jogou. */
export const QUORUM_FRACAO = 1 / 3;

/** Acima disso o empate deixa de distinguir alguém — igual às conquistas. */
export const MAXIMO_EMPATADOS = 3;

export type StatusDaRodada =
  | "OPEN"
  | "CONFIRMED"
  | "LIVE"
  | "FINISHED"
  | "CANCELLED";

export interface JanelaDaVotacao {
  aberta: boolean;
  /** Quando fecha. `null` quando a rodada nem terminou. */
  fechaEm: Date | null;
}

/**
 * Quando a votação abre e fecha.
 *
 * `encerradaEm` é o apito final. Rodada antiga, encerrada antes de existir a
 * coluna, chega aqui com a data da rodada — quem resolve esse "ou" é a
 * consulta, não esta função.
 */
export function janelaDaVotacao(
  status: StatusDaRodada,
  encerradaEm: Date | null,
  agora: Date,
): JanelaDaVotacao {
  if (status !== "FINISHED" || !encerradaEm) return { aberta: false, fechaEm: null };

  const fechaEm = new Date(encerradaEm.getTime() + HORAS_DE_VOTACAO * 60 * 60 * 1000);
  return { aberta: agora.getTime() < fechaEm.getTime(), fechaEm };
}

export type MotivoParaNaoVotar =
  | "rodada-nao-acabou"
  | "votacao-fechada"
  | "nao-jogou"
  | "ja-votou";

export type PermissaoDeVoto = { ok: true } | { ok: false; motivo: MotivoParaNaoVotar };

export interface ContextoDoVoto {
  status: StatusDaRodada;
  encerradaEm: Date | null;
  agora: Date;
  /** O votante esteve em campo nesta rodada. */
  jogou: boolean;
  jaVotou: boolean;
}

/** Se esta pessoa pode votar nesta rodada agora — e, quando não, por quê. */
export function podeVotar(contexto: ContextoDoVoto): PermissaoDeVoto {
  const janela = janelaDaVotacao(contexto.status, contexto.encerradaEm, contexto.agora);

  if (contexto.status !== "FINISHED") return { ok: false, motivo: "rodada-nao-acabou" };
  if (!janela.aberta) return { ok: false, motivo: "votacao-fechada" };
  if (!contexto.jogou) return { ok: false, motivo: "nao-jogou" };
  // Voto trocado seria voto rastreável: pra saber que mudou, alguém teria que
  // guardar o anterior. Um voto, e ele vale.
  if (contexto.jaVotou) return { ok: false, motivo: "ja-votou" };

  return { ok: true };
}

export type MotivoDeVotoInvalido = "votou-em-si" | "votado-nao-jogou";

export type ValidacaoDoVoto =
  | { ok: true }
  | { ok: false; motivo: MotivoDeVotoInvalido };

/** Em quem dá pra votar: qualquer um que jogou, menos você. */
export function votoValido(
  votanteId: string,
  votadoId: string,
  quemJogou: readonly string[],
): ValidacaoDoVoto {
  if (votanteId === votadoId) return { ok: false, motivo: "votou-em-si" };
  if (!quemJogou.includes(votadoId)) return { ok: false, motivo: "votado-nao-jogou" };
  return { ok: true };
}

/** Quantos votos esta rodada precisa pra eleger alguém. */
export function quorumNecessario(quantosJogaram: number): number {
  return Math.max(QUORUM_ABSOLUTO, Math.ceil(quantosJogaram * QUORUM_FRACAO));
}

export interface Apuracao {
  /** Vazio quando não houve quórum, ninguém votou ou empatou gente demais. */
  vencedores: string[];
  /** Votos do vencedor. 0 quando não há vencedor. */
  votosDoVencedor: number;
  totalDeVotos: number;
  quorum: number;
  alcancouQuorum: boolean;
}

/**
 * A apuração.
 *
 * Devolve **só o vencedor e a contagem dele**, nunca o placar completo: uma
 * lista com todo mundo e quantos votos cada um teve é um ranking de
 * popularidade com lanterna, que é exatamente o que não pode existir aqui.
 *
 * `votos` chega como pares votante→votado porque é assim que está no banco (o
 * par é o que garante um voto por pessoa). Ele entra aqui e não sai: o segredo
 * do voto é responsabilidade desta função.
 */
export function apurarVotacao(
  votos: ReadonlyArray<{ votanteId: string; votadoId: string }>,
  quantosJogaram: number,
): Apuracao {
  const quorum = quorumNecessario(quantosJogaram);

  // Um voto por votante, mesmo que a camada de cima falhe em garantir isso.
  const porVotante = new Map<string, string>();
  for (const voto of votos) {
    if (!porVotante.has(voto.votanteId)) porVotante.set(voto.votanteId, voto.votadoId);
  }

  const totalDeVotos = porVotante.size;
  const alcancouQuorum = totalDeVotos >= quorum;

  const contagem = new Map<string, number>();
  for (const votadoId of porVotante.values()) {
    contagem.set(votadoId, (contagem.get(votadoId) ?? 0) + 1);
  }

  const vazio: Apuracao = {
    vencedores: [],
    votosDoVencedor: 0,
    totalDeVotos,
    quorum,
    alcancouQuorum,
  };
  if (!alcancouQuorum || contagem.size === 0) return vazio;

  let melhor = 0;
  for (const votos of contagem.values()) melhor = Math.max(melhor, votos);

  const vencedores = [...contagem.entries()]
    .filter(([, quantidade]) => quantidade === melhor)
    .map(([playerId]) => playerId)
    .sort((a, b) => a.localeCompare(b));

  if (vencedores.length > MAXIMO_EMPATADOS) return vazio;

  return { ...vazio, vencedores, votosDoVencedor: melhor };
}
