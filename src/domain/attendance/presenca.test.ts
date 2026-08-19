import { describe, expect, it } from "vitest";
import {
  aplicarAcaoDePresenca,
  filaDaEspera,
  podeMexerNaPresenca,
  posicaoNaEspera,
  type EntradaDePresenca,
  type FormatoDaRodada,
  type PresencaNaRodada,
  type StatusDePresenca,
} from "./presenca";

/* ── Cenário base: society de 2 times, 6 vagas, espera de 3 ───── */

const FORMATO: FormatoDaRodada = {
  capacidade: 6,
  vagasDeGoleiro: 2,
  limiteDaEspera: 3,
};

/** Sem goleiro fixo (revezamento): o grupo não reserva vaga de gol. */
const FORMATO_SEM_GOLEIRO: FormatoDaRodada = { ...FORMATO, vagasDeGoleiro: 0 };

function presenca(
  playerId: string,
  status: StatusDePresenca,
  order: number,
  extras: Partial<Pick<PresencaNaRodada, "asGoalkeeper" | "goleiroNoElenco">> = {},
): PresencaNaRodada {
  return {
    playerId,
    status,
    order,
    asGoalkeeper: extras.asGoalkeeper ?? false,
    goleiroNoElenco: extras.goleiroNoElenco ?? false,
  };
}

/** Lista cheia: 6 confirmados (`c1`…`c6`), sendo `c1` o goleiro. */
function listaCheia(): PresencaNaRodada[] {
  return [
    presenca("c1", "CONFIRMED", 0, { asGoalkeeper: true, goleiroNoElenco: true }),
    presenca("c2", "CONFIRMED", 1),
    presenca("c3", "CONFIRMED", 2),
    presenca("c4", "CONFIRMED", 3),
    presenca("c5", "CONFIRMED", 4),
    presenca("c6", "CONFIRMED", 5),
  ];
}

function agir(entrada: Partial<EntradaDePresenca> & Pick<EntradaDePresenca, "acao" | "playerId">) {
  return aplicarAcaoDePresenca({
    presencas: [],
    formato: FORMATO,
    rodada: { status: "CONFIRMED", sorteada: false },
    ...entrada,
  });
}

/* ── Confirmar ─────────────────────────────────────────────── */

describe("jogador confirma", () => {
  it("entra na lista quando tem vaga, no fim da fila", () => {
    const presencas = [presenca("c1", "CONFIRMED", 0), presenca("c2", "CONFIRMED", 1)];
    const r = agir({ acao: "confirmar", playerId: "novo", presencas });

    expect(r).toMatchObject({ ok: true, status: "CONFIRMED", promovido: null });
    if (!r.ok) return;
    expect(r.mudancas).toEqual([
      { playerId: "novo", status: "CONFIRMED", order: 2, asGoalkeeper: false },
    ]);
  });

  it("presença nova de goleiro já nasce marcada como goleiro", () => {
    const r = agir({ acao: "confirmar", playerId: "gk", presencas: [], ehGoleiro: true });
    expect(r.ok && r.mudancas[0].asGoalkeeper).toBe(true);
  });

  it("clicar de novo no link não muda nada", () => {
    const presencas = [presenca("c1", "CONFIRMED", 0)];
    const r = agir({ acao: "confirmar", playerId: "c1", presencas });

    expect(r).toMatchObject({ ok: true, status: "CONFIRMED" });
    expect(r.ok && r.mudancas).toEqual([]);
  });

  it("lista cheia manda pra espera e diz a posição", () => {
    const presencas = [...listaCheia(), presenca("e1", "WAITING", 6)];
    const r = agir({ acao: "confirmar", playerId: "novo", presencas });

    expect(r).toMatchObject({ ok: true, status: "WAITING", posicaoNaEspera: 2 });
    if (!r.ok) return;
    expect(r.mudancas).toEqual([
      { playerId: "novo", status: "WAITING", order: 7, asGoalkeeper: false },
    ]);
    expect(r.mensagem).toMatch(/2º da espera/);
  });

  it("recusa quando a lista e a espera estão cheias", () => {
    const presencas = [
      ...listaCheia(),
      presenca("e1", "WAITING", 6),
      presenca("e2", "WAITING", 7),
      presenca("e3", "WAITING", 8),
    ];
    const r = agir({ acao: "confirmar", playerId: "novo", presencas });

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.motivo).toMatch(/cheias/i);
  });

  it("quem está na espera sobe sozinho se sobrou vaga", () => {
    // O organizador deixou alguém na espera com a lista pela metade.
    const presencas = [presenca("c1", "CONFIRMED", 0), presenca("e1", "WAITING", 1)];
    const r = agir({ acao: "confirmar", playerId: "e1", presencas });

    expect(r).toMatchObject({ ok: true, status: "CONFIRMED" });
    expect(r.ok && r.mudancas).toEqual([
      { playerId: "e1", status: "CONFIRMED", order: 2, asGoalkeeper: false },
    ]);
  });

  it("quem já espera e continua cheio recebe a posição, sem gravar nada", () => {
    const presencas = [
      ...listaCheia(),
      presenca("e1", "WAITING", 6),
      presenca("e2", "WAITING", 7),
    ];
    const r = agir({ acao: "confirmar", playerId: "e2", presencas });

    expect(r).toMatchObject({ ok: true, status: "WAITING", posicaoNaEspera: 2 });
    expect(r.ok && r.mudancas).toEqual([]);
  });

  it("quem cancelou e voltou atrás entra no fim da fila, não no lugar antigo", () => {
    const presencas = [
      presenca("desistente", "ABSENT", 0),
      presenca("c2", "CONFIRMED", 1),
      presenca("c3", "CONFIRMED", 2),
    ];
    const r = agir({ acao: "confirmar", playerId: "desistente", presencas });

    expect(r.ok && r.mudancas[0]).toMatchObject({ status: "CONFIRMED", order: 3 });
  });
});

/* ── Cancelar: a regra central ─────────────────────────────── */

describe("cancelou → primeiro da espera sobe", () => {
  it("sobe o primeiro da fila, e a fila é pela ordem, não pelo array", () => {
    const presencas = [
      ...listaCheia(),
      // De propósito fora de ordem: quem chegou primeiro tem `order` menor.
      presenca("e2", "WAITING", 7),
      presenca("e1", "WAITING", 6),
    ];
    const r = agir({ acao: "cancelar", playerId: "c3", presencas });

    expect(r).toMatchObject({ ok: true, status: "ABSENT", promovido: "e1" });
    if (!r.ok) return;
    expect(r.mudancas).toEqual([
      { playerId: "c3", status: "ABSENT", order: 2, asGoalkeeper: false },
      { playerId: "e1", status: "CONFIRMED", order: 8, asGoalkeeper: false },
    ]);
  });

  it("sem ninguém na espera, ninguém sobe e não é erro", () => {
    const r = agir({ acao: "cancelar", playerId: "c3", presencas: listaCheia() });

    expect(r).toMatchObject({ ok: true, status: "ABSENT", promovido: null });
    expect(r.ok && r.mudancas).toHaveLength(1);
  });

  it("sair da espera não promove ninguém", () => {
    const presencas = [
      ...listaCheia(),
      presenca("e1", "WAITING", 6),
      presenca("e2", "WAITING", 7),
    ];
    const r = agir({ acao: "cancelar", playerId: "e1", presencas });

    expect(r).toMatchObject({ ok: true, status: "ABSENT", promovido: null });
    expect(r.ok && r.mudancas).toEqual([
      { playerId: "e1", status: "ABSENT", order: 6, asGoalkeeper: false },
    ]);
  });

  it("cancelar duas vezes não muda nada", () => {
    const presencas = [...listaCheia(), presenca("fora", "ABSENT", 6)];
    const r = agir({ acao: "cancelar", playerId: "fora", presencas });

    expect(r).toMatchObject({ ok: true, status: "ABSENT" });
    expect(r.ok && r.mudancas).toEqual([]);
  });

  it("lista estourada: sair não abre vaga, então ninguém sobe", () => {
    // 7 confirmados para 6 vagas — o organizador colou gente demais.
    const presencas = [
      ...listaCheia(),
      presenca("c7", "CONFIRMED", 6),
      presenca("e1", "WAITING", 7),
    ];
    const r = agir({ acao: "cancelar", playerId: "c7", presencas });

    expect(r).toMatchObject({ ok: true, promovido: null });
    expect(r.ok && r.mudancas).toHaveLength(1);
  });
});

/* ── Goleiro ───────────────────────────────────────────────── */

describe("goleiro que cai", () => {
  it("goleiro sai e o goleiro da espera fura a fila", () => {
    const presencas = [
      ...listaCheia(),
      presenca("e1", "WAITING", 6),
      presenca("gk-espera", "WAITING", 7, { goleiroNoElenco: true }),
    ];
    const r = agir({ acao: "cancelar", playerId: "c1", presencas });

    expect(r).toMatchObject({ ok: true, promovido: "gk-espera" });
    if (!r.ok) return;
    // Sobe já ocupando a vaga de gol: é o que o sorteio vai ler.
    expect(r.mudancas[1]).toMatchObject({ status: "CONFIRMED", asGoalkeeper: true });
    expect(r.avisos).not.toContain("sem-goleiro-na-espera");
  });

  it("sem goleiro na espera, sobe o primeiro mesmo assim — e avisa", () => {
    const presencas = [...listaCheia(), presenca("e1", "WAITING", 6)];
    const r = agir({ acao: "cancelar", playerId: "c1", presencas });

    expect(r).toMatchObject({ ok: true, promovido: "e1" });
    expect(r.ok && r.avisos).toContain("sem-goleiro-na-espera");
    // Quem subiu não vira goleiro por decreto.
    expect(r.ok && r.mudancas[1].asGoalkeeper).toBe(false);
  });

  it("goleiro cai com a espera vazia: ninguém sobe, mas o aviso sai", () => {
    const r = agir({ acao: "cancelar", playerId: "c1", presencas: listaCheia() });

    expect(r).toMatchObject({ ok: true, promovido: null });
    expect(r.ok && r.avisos).toContain("sem-goleiro-na-espera");
  });

  it("grupo sem vaga de goleiro não fura fila nenhuma", () => {
    const presencas = [
      ...listaCheia(),
      presenca("e1", "WAITING", 6),
      presenca("gk-espera", "WAITING", 7, { goleiroNoElenco: true }),
    ];
    const r = agir({
      acao: "cancelar",
      playerId: "c1",
      presencas,
      formato: FORMATO_SEM_GOLEIRO,
    });

    expect(r).toMatchObject({ ok: true, promovido: "e1" });
    expect(r.ok && r.avisos).not.toContain("sem-goleiro-na-espera");
  });
});

/* ── Estado da rodada ──────────────────────────────────────── */

describe("rodada fechada a mexida", () => {
  it("aceita rodada aberta e confirmada", () => {
    expect(podeMexerNaPresenca("OPEN")).toBe(true);
    expect(podeMexerNaPresenca("CONFIRMED")).toBe(true);
  });

  it.each(["LIVE", "FINISHED", "CANCELLED"] as const)("recusa rodada %s", (status) => {
    const r = agir({
      acao: "cancelar",
      playerId: "c1",
      presencas: listaCheia(),
      rodada: { status, sorteada: true },
    });

    expect(r.ok).toBe(false);
  });

  it("deixa cancelar depois do sorteio, mas avisa que os times envelheceram", () => {
    const r = agir({
      acao: "cancelar",
      playerId: "c3",
      presencas: listaCheia(),
      rodada: { status: "CONFIRMED", sorteada: true },
    });

    expect(r.ok).toBe(true);
    expect(r.ok && r.avisos).toContain("times-ja-sorteados");
  });
});

/* ── Leitura da fila ───────────────────────────────────────── */

describe("fila da espera", () => {
  it("ordena por chegada e ignora quem não espera", () => {
    const presencas = [
      presenca("e2", "WAITING", 9),
      presenca("c1", "CONFIRMED", 0),
      presenca("e1", "WAITING", 5),
      presenca("fora", "ABSENT", 3),
    ];

    expect(filaDaEspera(presencas).map((p) => p.playerId)).toEqual(["e1", "e2"]);
    expect(posicaoNaEspera(presencas, "e2")).toBe(2);
    expect(posicaoNaEspera(presencas, "c1")).toBe(0);
  });
});
