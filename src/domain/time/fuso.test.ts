import { describe, expect, it } from "vitest";
import {
  diaDaSemanaNoFuso,
  inicioDoDiaNoFuso,
  inicioDoMesNoFuso,
  instanteDoFuso,
  partesNoFuso,
} from "./fuso";

// As asserções são todas em ISO (UTC) de propósito: assim o teste vale
// igual na máquina do dev (horário do Brasil) e na Vercel (UTC).

describe("instanteDoFuso", () => {
  it("grava a hora de parede do fuso, não a do processo", () => {
    // Brasília é UTC−3 o ano inteiro desde 2019.
    expect(instanteDoFuso(2026, 7, 20, 20, 30).toISOString()).toBe("2026-08-20T23:30:00.000Z");
  });

  it("é o inverso de partesNoFuso", () => {
    const instante = instanteDoFuso(2026, 7, 20, 20, 30);
    expect(partesNoFuso(instante)).toEqual({
      ano: 2026,
      mes: 7,
      dia: 20,
      hora: 20,
      minuto: 30,
      diaDaSemana: 4,
    });
  });

  it("deixa o dia estourar o mês, como o construtor do Date", () => {
    // 31 de agosto + 7 dias = 7 de setembro.
    expect(instanteDoFuso(2026, 7, 31 + 7, 20, 0).toISOString()).toBe("2026-09-07T23:00:00.000Z");
  });

  it("não usa o fuso do processo nem quando pedem outro", () => {
    // Manaus é UTC−4: a mesma hora de parede é um instante diferente.
    expect(instanteDoFuso(2026, 7, 20, 20, 30, "America/Manaus").toISOString()).toBe(
      "2026-08-21T00:30:00.000Z",
    );
  });
});

describe("diaDaSemanaNoFuso", () => {
  it("usa o dia do fuso, não o do UTC, na virada da meia-noite", () => {
    // 21/08/2026 00:30 UTC ainda é quinta 20/08 em Brasília.
    const instante = new Date("2026-08-21T00:30:00.000Z");
    expect(instante.getUTCDay()).toBe(5); // sexta em UTC
    expect(diaDaSemanaNoFuso(instante)).toBe(4); // quinta em Brasília
  });
});

describe("inicioDoDiaNoFuso", () => {
  it("é meia-noite do fuso, não meia-noite UTC", () => {
    const instante = new Date("2026-08-21T00:30:00.000Z");
    expect(inicioDoDiaNoFuso(instante).toISOString()).toBe("2026-08-20T03:00:00.000Z");
  });
});

describe("inicioDoMesNoFuso", () => {
  it("corta o mês pelo relógio do fuso", () => {
    // 01/09 00:30 UTC ainda é 31/08 em Brasília: o mês é agosto.
    const instante = new Date("2026-09-01T00:30:00.000Z");
    expect(inicioDoMesNoFuso(instante).toISOString()).toBe("2026-08-01T03:00:00.000Z");
  });
});
