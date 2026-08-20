import { describe, expect, it } from "vitest";
import {
  apurarVotacao,
  janelaDaVotacao,
  podeVotar,
  quorumNecessario,
  votoValido,
  HORAS_DE_VOTACAO,
  MAXIMO_EMPATADOS,
  QUORUM_ABSOLUTO,
} from "./votacao";

const APITO = new Date("2026-01-08T23:30:00Z");
const hora = (h: number) => new Date(APITO.getTime() + h * 60 * 60 * 1000);

describe("janelaDaVotacao", () => {
  it("fecha HORAS_DE_VOTACAO depois do apito final", () => {
    const janela = janelaDaVotacao("FINISHED", APITO, hora(1));

    expect(janela.aberta).toBe(true);
    expect(janela.fechaEm?.toISOString()).toBe(hora(HORAS_DE_VOTACAO).toISOString());
  });

  it("está fechada depois do prazo", () => {
    expect(janelaDaVotacao("FINISHED", APITO, hora(HORAS_DE_VOTACAO + 1)).aberta).toBe(
      false,
    );
  });

  it("rodada que não acabou não tem votação aberta", () => {
    expect(janelaDaVotacao("LIVE", null, hora(1))).toEqual({
      aberta: false,
      fechaEm: null,
    });
  });

  it("rodada encerrada sem data de apito não abre votação", () => {
    expect(janelaDaVotacao("FINISHED", null, hora(1)).aberta).toBe(false);
  });
});

describe("podeVotar", () => {
  const base = {
    status: "FINISHED" as const,
    encerradaEm: APITO,
    agora: hora(2),
    jogou: true,
    jaVotou: false,
  };

  it("quem jogou pode votar com a rodada encerrada e o prazo aberto", () => {
    expect(podeVotar(base)).toEqual({ ok: true });
  });

  it("rodada em andamento não aceita voto", () => {
    expect(podeVotar({ ...base, status: "LIVE" })).toEqual({
      ok: false,
      motivo: "rodada-nao-acabou",
    });
  });

  it("prazo vencido fecha a urna", () => {
    expect(podeVotar({ ...base, agora: hora(HORAS_DE_VOTACAO + 1) })).toEqual({
      ok: false,
      motivo: "votacao-fechada",
    });
  });

  it("quem não jogou não vota — não tem o que julgar", () => {
    expect(podeVotar({ ...base, jogou: false })).toEqual({
      ok: false,
      motivo: "nao-jogou",
    });
  });

  it("um voto por pessoa, e ele vale", () => {
    expect(podeVotar({ ...base, jaVotou: true })).toEqual({
      ok: false,
      motivo: "ja-votou",
    });
  });
});

describe("votoValido", () => {
  const jogaram = ["a", "b", "c"];

  it("aceita voto em quem jogou", () => {
    expect(votoValido("a", "b", jogaram)).toEqual({ ok: true });
  });

  it("recusa voto em si mesmo", () => {
    expect(votoValido("a", "a", jogaram)).toEqual({ ok: false, motivo: "votou-em-si" });
  });

  it("recusa voto em quem não estava lá", () => {
    expect(votoValido("a", "z", jogaram)).toEqual({
      ok: false,
      motivo: "votado-nao-jogou",
    });
  });
});

describe("quorumNecessario", () => {
  it("nunca desce do mínimo absoluto", () => {
    expect(quorumNecessario(4)).toBe(QUORUM_ABSOLUTO);
  });

  it("exige um terço quando o grupo é grande", () => {
    expect(quorumNecessario(20)).toBe(7);
  });
});

describe("apurarVotacao", () => {
  const votos = (pares: Array<[string, string]>) =>
    pares.map(([votanteId, votadoId]) => ({ votanteId, votadoId }));

  it("elege quem teve mais votos", () => {
    const apuracao = apurarVotacao(
      votos([
        ["a", "z"],
        ["b", "z"],
        ["c", "z"],
        ["d", "y"],
      ]),
      9,
    );

    expect(apuracao.vencedores).toEqual(["z"]);
    expect(apuracao.votosDoVencedor).toBe(3);
    expect(apuracao.totalDeVotos).toBe(4);
  });

  it("sem quórum não elege ninguém, mesmo com voto", () => {
    const apuracao = apurarVotacao(votos([["a", "z"]]), 10);

    expect(apuracao.alcancouQuorum).toBe(false);
    expect(apuracao.vencedores).toEqual([]);
    expect(apuracao.votosDoVencedor).toBe(0);
  });

  it("empate divide, como todas as conquistas", () => {
    const apuracao = apurarVotacao(
      votos([
        ["a", "y"],
        ["b", "y"],
        ["c", "z"],
        ["d", "z"],
      ]),
      8,
    );

    expect(apuracao.vencedores).toEqual(["y", "z"]);
    expect(apuracao.votosDoVencedor).toBe(2);
  });

  it("empate de gente demais não coroa ninguém", () => {
    const pares: Array<[string, string]> = [];
    for (let i = 0; i < MAXIMO_EMPATADOS + 1; i++) {
      pares.push([`votante${i}`, `candidato${i}`]);
    }

    expect(apurarVotacao(votos(pares), 6).vencedores).toEqual([]);
  });

  it("voto repetido do mesmo votante conta uma vez só", () => {
    const apuracao = apurarVotacao(
      votos([
        ["a", "z"],
        ["a", "y"],
        ["b", "z"],
        ["c", "z"],
      ]),
      6,
    );

    expect(apuracao.totalDeVotos).toBe(3);
    expect(apuracao.vencedores).toEqual(["z"]);
  });

  it("urna vazia devolve apuração vazia sem estourar", () => {
    const apuracao = apurarVotacao([], 10);

    expect(apuracao.vencedores).toEqual([]);
    expect(apuracao.totalDeVotos).toBe(0);
    expect(apuracao.quorum).toBe(4);
  });

  it("a apuração não devolve quem votou em quem — o voto é secreto", () => {
    const apuracao = apurarVotacao(
      votos([
        ["a", "z"],
        ["b", "z"],
        ["c", "z"],
      ]),
      6,
    );

    // O segredo do voto é regra, não detalhe de tela: se alguém devolver o
    // placar completo daqui, este teste cai junto.
    expect(Object.keys(apuracao).sort()).toEqual([
      "alcancouQuorum",
      "quorum",
      "totalDeVotos",
      "vencedores",
      "votosDoVencedor",
    ]);
  });
});
