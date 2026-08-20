// Conquistas do grupo (Fase 2 — plano §27). Puro: recebe rodadas já agregadas
// e devolve quem ganhou o quê. A tela só desenha.
//
// A regra que o plano impõe e que manda no desenho inteiro deste arquivo:
// *"Gamificação deve ser leve e positiva. Evitar mecânicas que gerem conflito
// desnecessário."* Por isso:
//
// - **não existe conquista negativa.** Nada de "pior do mês", "perna de pau",
//   ranking de gol contra. Gol contra, aliás, já não conta pra ninguém;
// - **empate divide a conquista** em vez de escolher por critério inventado —
//   dois artilheiros do mês é uma resenha, um artilheiro escolhido por ordem
//   alfabética é uma briga;
// - **conquista que muita gente tem não é conquista.** Acima de
//   `MAXIMO_EMPATADOS` ninguém leva: no primeiro mês do grupo, seis caras com
//   um gol cada não são seis artilheiros;
// - o **nível técnico não entra aqui** (plano §13). Conquista se ganha jogando.

export type TipoDeConquista =
  | "artilheiro"
  | "garcom"
  | "presenca-de-ferro"
  | "hat-trick"
  | "mvp"
  | "escolha-da-galera"
  | "estreia";

export interface Conquista {
  tipo: TipoDeConquista;
  playerId: string;
  /** O número que dá sentido: gols, assistências, rodadas seguidas. */
  valor: number;
  /** Rodada em que aconteceu — só nas conquistas de uma rodada só. */
  roundId?: string;
}

/** Rodadas seguidas pra virar "presença de ferro" — um mês de fut semanal. */
export const MINIMO_SEQUENCIA = 4;
/** Gols numa rodada pra ser hat-trick. */
export const GOLS_DO_HAT_TRICK = 3;
/** Acima disso a conquista deixa de distinguir alguém e não é dada a ninguém. */
export const MAXIMO_EMPATADOS = 3;
/**
 * Estreantes numa rodada só. Acima disso não é estreia de ninguém: é o grupo
 * inteiro começando (a primeira rodada da vida do grupo estreia 20 pessoas de
 * uma vez, e 20 medalhas iguais não são medalha).
 */
export const MAXIMO_ESTREANTES = 3;

export const CONQUISTAS: Record<
  TipoDeConquista,
  {
    rotulo: string;
    descricao: (valor: number) => string;
    /** Cor semântica do design system (plano §42). */
    tom: "green" | "yellow" | "red" | "pink";
    /** Só pra mensagem do WhatsApp — a UI usa ícone. */
    emoji: string;
  }
> = {
  artilheiro: {
    rotulo: "Artilheiro do mês",
    descricao: (valor) => `${valor} ${valor === 1 ? "gol" : "gols"} no mês`,
    tom: "red",
    emoji: "⚽",
  },
  garcom: {
    rotulo: "Garçom do mês",
    descricao: (valor) =>
      `${valor} ${valor === 1 ? "assistência" : "assistências"} no mês`,
    tom: "yellow",
    emoji: "🎯",
  },
  "presenca-de-ferro": {
    rotulo: "Presença de ferro",
    descricao: (valor) => `${valor} rodadas seguidas sem faltar`,
    tom: "green",
    emoji: "🧱",
  },
  "hat-trick": {
    rotulo: "Hat-trick",
    descricao: (valor) => `${valor} gols numa rodada só`,
    tom: "red",
    emoji: "🎩",
  },
  mvp: {
    rotulo: "Craque da rodada",
    descricao: (valor) =>
      `${valor} ${valor === 1 ? "participação" : "participações"} em gol`,
    tom: "pink",
    emoji: "🏆",
  },
  "escolha-da-galera": {
    rotulo: "Escolha da galera",
    descricao: (valor) => (valor === 1 ? "1 voto" : `${valor} votos`),
    tom: "yellow",
    emoji: "🗳️",
  },
  estreia: {
    rotulo: "Estreia",
    descricao: () => "Primeira rodada no grupo",
    tom: "pink",
    emoji: "✨",
  },
};

export interface RodadaDoHistorico {
  roundId: string;
  /** Quem esteve confirmado. Espera e falta não contam presença. */
  presentes: string[];
  gols: Record<string, number>;
  assistencias: Record<string, number>;
  /** MVP da rodada, já decidido por `mvpDaRodada`. */
  mvpPlayerId?: string | null;
  /**
   * Quem a galera elegeu no voto (`domain/mvp/votacao`), quando houve quórum.
   *
   * Convive com `mvpPlayerId` em vez de substituí-lo: o craque calculado sai de
   * participação em gol e por construção nunca premia goleiro nem zagueiro. Os
   * dois prêmios existem porque medem coisas diferentes, e cair no mesmo nome é
   * resenha garantida.
   */
  escolhaDaGaleraIds?: string[];
  /** Votos que o eleito recebeu — é o número que dá sentido à conquista. */
  votosDaEscolha?: number;
}

/* ── Peças ─────────────────────────────────────────────────── */

function somar(rodadas: RodadaDoHistorico[], campo: "gols" | "assistencias") {
  const total = new Map<string, number>();
  for (const rodada of rodadas) {
    for (const [playerId, quantidade] of Object.entries(rodada[campo])) {
      total.set(playerId, (total.get(playerId) ?? 0) + quantidade);
    }
  }
  return total;
}

/**
 * Quem está no topo. Devolve vazio quando ninguém pontuou, e também quando
 * empatou gente demais — ver `MAXIMO_EMPATADOS`.
 */
export function liderancaCompartilhada(
  total: Map<string, number>,
): { playerIds: string[]; valor: number } {
  let melhor = 0;
  for (const valor of total.values()) melhor = Math.max(melhor, valor);
  if (melhor <= 0) return { playerIds: [], valor: 0 };

  const empatados = [...total.entries()]
    .filter(([, valor]) => valor === melhor)
    .map(([playerId]) => playerId)
    // Ordem estável: a tela mostra sempre na mesma sequência.
    .sort((a, b) => a.localeCompare(b));

  if (empatados.length > MAXIMO_EMPATADOS) return { playerIds: [], valor: 0 };
  return { playerIds: empatados, valor: melhor };
}

/**
 * Rodadas seguidas em que o jogador esteve presente, contadas **de trás pra
 * frente** a partir da última rodada.
 *
 * É a sequência *atual*, não o recorde: o que motiva é "você está há 6 rodadas
 * sem faltar", não "uma vez você ficou 6". Rodada em que a pessoa nem existia
 * no grupo interrompe naturalmente — quem chegou faz duas semanas tem
 * sequência de 2, e 2 não dá conquista.
 *
 * `rodadas` vem em ordem cronológica, da mais antiga pra mais nova.
 */
export function sequenciaDePresenca(
  rodadas: RodadaDoHistorico[],
  playerId: string,
): number {
  let sequencia = 0;
  for (let i = rodadas.length - 1; i >= 0; i--) {
    if (!rodadas[i].presentes.includes(playerId)) break;
    sequencia += 1;
  }
  return sequencia;
}

/* ── As conquistas ─────────────────────────────────────────── */

/**
 * Conquistas que só fazem sentido olhando um punhado de rodadas: artilheiro,
 * garçom e presença de ferro. `rodadas` em ordem cronológica.
 */
export function conquistasDoPeriodo(rodadas: RodadaDoHistorico[]): Conquista[] {
  if (rodadas.length === 0) return [];

  const conquistas: Conquista[] = [];

  const artilharia = liderancaCompartilhada(somar(rodadas, "gols"));
  for (const playerId of artilharia.playerIds) {
    conquistas.push({ tipo: "artilheiro", playerId, valor: artilharia.valor });
  }

  const garcons = liderancaCompartilhada(somar(rodadas, "assistencias"));
  for (const playerId of garcons.playerIds) {
    conquistas.push({ tipo: "garcom", playerId, valor: garcons.valor });
  }

  // Presença de ferro não é disputa: todo mundo que alcançou a marca ganha.
  const candidatos = new Set(rodadas.flatMap((rodada) => rodada.presentes));
  const sequencias = [...candidatos]
    .map((playerId) => ({ playerId, valor: sequenciaDePresenca(rodadas, playerId) }))
    .filter((entrada) => entrada.valor >= MINIMO_SEQUENCIA)
    .sort((a, b) => b.valor - a.valor || a.playerId.localeCompare(b.playerId));

  for (const { playerId, valor } of sequencias) {
    conquistas.push({ tipo: "presenca-de-ferro", playerId, valor });
  }

  return conquistas;
}

/**
 * Conquistas de uma rodada só: craque da rodada, escolha da galera, hat-trick
 * e estreia.
 *
 * `estreantes` são os jogadores para quem esta é a primeira rodada da vida no
 * grupo — quem sabe isso é quem consultou o banco, não esta função.
 */
export function conquistasDaRodada(
  rodada: RodadaDoHistorico,
  estreantes: string[] = [],
): Conquista[] {
  const conquistas: Conquista[] = [];

  if (rodada.mvpPlayerId) {
    const gols = rodada.gols[rodada.mvpPlayerId] ?? 0;
    const assistencias = rodada.assistencias[rodada.mvpPlayerId] ?? 0;
    conquistas.push({
      tipo: "mvp",
      playerId: rodada.mvpPlayerId,
      valor: gols + assistencias,
      roundId: rodada.roundId,
    });
  }

  // Empate na votação divide a conquista, como no resto do módulo. Quem
  // decidiu que houve empate (e que ele não é grande demais) foi a apuração.
  for (const playerId of rodada.escolhaDaGaleraIds ?? []) {
    conquistas.push({
      tipo: "escolha-da-galera",
      playerId,
      valor: rodada.votosDaEscolha ?? 0,
      roundId: rodada.roundId,
    });
  }

  const hatTricks = Object.entries(rodada.gols)
    .filter(([, gols]) => gols >= GOLS_DO_HAT_TRICK)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  for (const [playerId, gols] of hatTricks) {
    conquistas.push({ tipo: "hat-trick", playerId, valor: gols, roundId: rodada.roundId });
  }

  // Estreia só vale pra quem realmente jogou: entrar no elenco não é estrear.
  const estreouEmCampo = [...estreantes]
    .filter((playerId) => rodada.presentes.includes(playerId))
    .sort((a, b) => a.localeCompare(b));

  if (estreouEmCampo.length <= MAXIMO_ESTREANTES) {
    for (const playerId of estreouEmCampo) {
      conquistas.push({ tipo: "estreia", playerId, valor: 1, roundId: rodada.roundId });
    }
  }

  return conquistas;
}

/** Agrupa por jogador — é como a tela de perfil e o card do jogador leem. */
export function conquistasPorJogador(
  conquistas: Conquista[],
): Map<string, Conquista[]> {
  const porJogador = new Map<string, Conquista[]>();
  for (const conquista of conquistas) {
    const lista = porJogador.get(conquista.playerId) ?? [];
    lista.push(conquista);
    porJogador.set(conquista.playerId, lista);
  }
  return porJogador;
}
