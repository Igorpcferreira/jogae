// Presença na rodada — a regra que o bloco I precisa (confirmação por link
// pessoal, sem conta).
//
// Puro de propósito: a mesma decisão serve pro jogador clicando no link dele,
// pro organizador mexendo na lista e pro botão "promover" da tela de presenças.
// Nenhum dos três precisa de banco pra saber o que acontece.
//
// Invariante do plano §13: **nível técnico não entra nem sai desta função**.
// Quem sobe da espera sobe por ordem de chegada, nunca por nota.

export type StatusDePresenca = "CONFIRMED" | "WAITING" | "ABSENT";

export type StatusDaRodada =
  | "OPEN"
  | "CONFIRMED"
  | "LIVE"
  | "FINISHED"
  | "CANCELLED";

export interface PresencaNaRodada {
  playerId: string;
  status: StatusDePresenca;
  /** Posição na lista. Quem entra vai sempre pro fim (ver `proximaOrdem`). */
  order: number;
  /** Marcado como goleiro nesta rodada. */
  asGoalkeeper: boolean;
  /**
   * Goleiro no cadastro do elenco. Existe separado de `asGoalkeeper` porque a
   * lista importada só marca goleiro entre os confirmados — goleiro parado na
   * espera chega aqui com `asGoalkeeper: false` e ainda assim é goleiro. É a
   * mesma conta que o sorteio já faz em `sortearTimes`.
   */
  goleiroNoElenco: boolean;
}

export interface FormatoDaRodada {
  /** Vagas de confirmado: times × (linha + gol). */
  capacidade: number;
  /** Vagas reservadas a goleiro. 0 = grupo sem goleiro fixo (revezamento). */
  vagasDeGoleiro: number;
  /** Quantos cabem na espera. */
  limiteDaEspera: number;
}

export type AcaoDePresenca = "confirmar" | "cancelar";

/**
 * Coisa que o organizador precisa saber e que a regra não resolve sozinha.
 * Sai como código, não como frase: quem escreve texto de tela é a tela.
 */
export type AvisoDePresenca = "sem-goleiro-na-espera" | "times-ja-sorteados";

/** Estado final de uma linha da lista. A action grava isto e nada mais. */
export interface MudancaDePresenca {
  playerId: string;
  status: StatusDePresenca;
  order: number;
  asGoalkeeper: boolean;
}

export interface EntradaDePresenca {
  acao: AcaoDePresenca;
  playerId: string;
  /** A lista inteira da rodada, do jeito que está no banco. */
  presencas: PresencaNaRodada[];
  formato: FormatoDaRodada;
  rodada: { status: StatusDaRodada; sorteada: boolean };
  /** Goleiro no cadastro — só serve pra presença nova nascer com a marca certa. */
  ehGoleiro?: boolean;
}

export type ResultadoDePresenca =
  | { ok: false; motivo: string }
  | {
      ok: true;
      /** Onde o jogador ficou. */
      status: StatusDePresenca;
      /** Vazio quando nada mudou — clique repetido não é erro. */
      mudancas: MudancaDePresenca[];
      /** Quem subiu da espera por causa desta mudança. */
      promovido: string | null;
      /** Posição na fila quando o jogador terminou na espera; 0 quando não. */
      posicaoNaEspera: number;
      avisos: AvisoDePresenca[];
      /** Frase pro jogador. Mora aqui porque as três portas dizem o mesmo. */
      mensagem: string;
    };

/* ── Rodada aberta a mexida ────────────────────────────────── */

const RECUSA_POR_STATUS: Partial<Record<StatusDaRodada, string>> = {
  LIVE: "O jogo já começou — fala direto com quem tá organizando.",
  FINISHED: "Essa rodada já acabou.",
  CANCELLED: "Essa rodada foi cancelada.",
};

/** Presença só muda enquanto a rodada não virou jogo. */
export function podeMexerNaPresenca(status: StatusDaRodada): boolean {
  return status === "OPEN" || status === "CONFIRMED";
}

/* ── Leitura da lista ──────────────────────────────────────── */

const ehGoleiroDeVerdade = (presenca: PresencaNaRodada): boolean =>
  presenca.asGoalkeeper || presenca.goleiroNoElenco;

const confirmados = (presencas: PresencaNaRodada[]) =>
  presencas.filter((presenca) => presenca.status === "CONFIRMED");

/** Fila da espera na ordem que vale: quem chegou primeiro sobe primeiro. */
export function filaDaEspera(presencas: PresencaNaRodada[]): PresencaNaRodada[] {
  return presencas
    .filter((presenca) => presenca.status === "WAITING")
    .sort((a, b) => a.order - b.order);
}

/** Posição (1-based) do jogador na espera. 0 = não está esperando. */
export function posicaoNaEspera(
  presencas: PresencaNaRodada[],
  playerId: string,
): number {
  const indice = filaDaEspera(presencas).findIndex(
    (presenca) => presenca.playerId === playerId,
  );
  return indice < 0 ? 0 : indice + 1;
}

/**
 * Próxima posição livre. Quem entra na lista — confirmando, subindo da espera
 * ou voltando atrás de um "não vou" — vai sempre pro fim. A ordem só cresce, e
 * por isso nunca colide com quem já está lá.
 */
function proximaOrdem(presencas: PresencaNaRodada[]): number {
  return presencas.reduce((maior, presenca) => Math.max(maior, presenca.order), -1) + 1;
}

/**
 * Quem sobe quando abre uma vaga.
 *
 * Regra base: o primeiro da fila. A exceção é goleiro — se quem saiu era
 * goleiro e o grupo reserva vaga de goleiro, fura a fila o primeiro goleiro que
 * estiver esperando. Sem isso o time fica sem quem pega bola e o organizador
 * teria que desfazer a promoção na mão. Se não houver goleiro esperando, sobe o
 * primeiro mesmo assim — vaga vazia não ajuda ninguém — e sai o aviso.
 */
export function escolherQuemSobe(
  presencas: PresencaNaRodada[],
  opcoes: { preferirGoleiro: boolean },
): { quem: PresencaNaRodada | null; achouGoleiro: boolean } {
  const fila = filaDaEspera(presencas);

  if (opcoes.preferirGoleiro) {
    const goleiro = fila.find(ehGoleiroDeVerdade);
    if (goleiro) return { quem: goleiro, achouGoleiro: true };
    return { quem: fila[0] ?? null, achouGoleiro: false };
  }

  return { quem: fila[0] ?? null, achouGoleiro: true };
}

/* ── A decisão ─────────────────────────────────────────────── */

export function aplicarAcaoDePresenca(
  entrada: EntradaDePresenca,
): ResultadoDePresenca {
  const { acao, playerId, presencas, formato, rodada } = entrada;

  if (!podeMexerNaPresenca(rodada.status)) {
    return {
      ok: false,
      motivo: RECUSA_POR_STATUS[rodada.status] ?? "Essa rodada não aceita mudança.",
    };
  }

  const atual = presencas.find((presenca) => presenca.playerId === playerId) ?? null;
  const avisos: AvisoDePresenca[] = rodada.sorteada ? ["times-ja-sorteados"] : [];

  return acao === "confirmar"
    ? confirmar({
        playerId,
        atual,
        presencas,
        formato,
        avisos,
        ordem: proximaOrdem(presencas),
        ehGoleiro: entrada.ehGoleiro ?? false,
      })
    : cancelar({ playerId, atual, presencas, formato, avisos });
}

function confirmar(ctx: {
  playerId: string;
  atual: PresencaNaRodada | null;
  presencas: PresencaNaRodada[];
  formato: FormatoDaRodada;
  avisos: AvisoDePresenca[];
  ordem: number;
  ehGoleiro: boolean;
}): ResultadoDePresenca {
  const { playerId, atual, presencas, formato, avisos, ordem } = ctx;

  // O link vive no WhatsApp e vai ser clicado de novo. Repetir não é erro.
  if (atual?.status === "CONFIRMED") {
    return {
      ok: true,
      status: "CONFIRMED",
      mudancas: [],
      promovido: null,
      posicaoNaEspera: 0,
      avisos: [],
      mensagem: "Você já tava dentro.",
    };
  }

  const marcadoComoGoleiro = atual?.asGoalkeeper ?? ctx.ehGoleiro;
  const temVaga = confirmados(presencas).length < formato.capacidade;

  if (temVaga) {
    return {
      ok: true,
      status: "CONFIRMED",
      mudancas: [
        { playerId, status: "CONFIRMED", order: ordem, asGoalkeeper: marcadoComoGoleiro },
      ],
      promovido: null,
      posicaoNaEspera: 0,
      avisos,
      mensagem: "Fechou, você tá dentro.",
    };
  }

  // Já esperava e continua cheio: nada a fazer, mas vale dizer em que pé está.
  if (atual?.status === "WAITING") {
    const posicao = posicaoNaEspera(presencas, playerId);
    return {
      ok: true,
      status: "WAITING",
      mudancas: [],
      promovido: null,
      posicaoNaEspera: posicao,
      avisos: [],
      mensagem: `Você já tá na espera, ${posicao}º da fila.`,
    };
  }

  const fila = filaDaEspera(presencas);
  if (fila.length >= formato.limiteDaEspera) {
    return {
      ok: false,
      motivo: "A lista e a espera estão cheias. Fala com quem tá organizando.",
    };
  }

  const posicao = fila.length + 1;
  return {
    ok: true,
    status: "WAITING",
    mudancas: [
      { playerId, status: "WAITING", order: ordem, asGoalkeeper: marcadoComoGoleiro },
    ],
    promovido: null,
    posicaoNaEspera: posicao,
    avisos,
    mensagem: `Lista cheia. Você é o ${posicao}º da espera — se alguém cair, você sobe.`,
  };
}

function cancelar(ctx: {
  playerId: string;
  atual: PresencaNaRodada | null;
  presencas: PresencaNaRodada[];
  formato: FormatoDaRodada;
  avisos: AvisoDePresenca[];
}): ResultadoDePresenca {
  const { playerId, atual, presencas, formato, avisos } = ctx;

  if (!atual || atual.status === "ABSENT") {
    return {
      ok: true,
      status: "ABSENT",
      mudancas: [],
      promovido: null,
      posicaoNaEspera: 0,
      avisos: [],
      mensagem: "Já tava marcado que você não vai.",
    };
  }

  const saida: MudancaDePresenca = {
    playerId,
    status: "ABSENT",
    order: atual.order,
    asGoalkeeper: atual.asGoalkeeper,
  };

  // Sair da espera não abre vaga pra ninguém.
  if (atual.status === "WAITING") {
    return {
      ok: true,
      status: "ABSENT",
      mudancas: [saida],
      promovido: null,
      posicaoNaEspera: 0,
      avisos,
      mensagem: "Beleza, tirei você da espera.",
    };
  }

  const semPromocao: ResultadoDePresenca = {
    ok: true,
    status: "ABSENT",
    mudancas: [saida],
    promovido: null,
    posicaoNaEspera: 0,
    avisos,
    mensagem: "Beleza, avisei o pessoal.",
  };

  // Lista estourada — o organizador colou mais gente que o formato aguenta.
  // Sair não abre vaga de verdade, então ninguém sobe.
  if (confirmados(presencas).length - 1 >= formato.capacidade) return semPromocao;

  const preferirGoleiro = ehGoleiroDeVerdade(atual) && formato.vagasDeGoleiro > 0;
  const { quem, achouGoleiro } = escolherQuemSobe(presencas, { preferirGoleiro });
  if (!achouGoleiro) avisos.push("sem-goleiro-na-espera");
  if (!quem) return semPromocao;

  return {
    ok: true,
    status: "ABSENT",
    mudancas: [
      saida,
      {
        playerId: quem.playerId,
        status: "CONFIRMED",
        order: proximaOrdem(presencas),
        // Sobe ocupando a vaga que abriu: goleiro que substitui goleiro já
        // entra marcado, que é o que o sorteio vai ler.
        asGoalkeeper:
          preferirGoleiro && ehGoleiroDeVerdade(quem) ? true : quem.asGoalkeeper,
      },
    ],
    promovido: quem.playerId,
    posicaoNaEspera: 0,
    avisos,
    mensagem: "Beleza, avisei o pessoal.",
  };
}
