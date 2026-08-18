import { describe, expect, it } from "vitest";
import { instanteDoFuso } from "@/domain/time/fuso";
import {
  formatRoundSchedule,
  nomeDoDiaDaSemana,
  relativeDay,
  startOfMonth,
  weekdayName,
} from "./dates";

// Estas funções não tinham teste, e é por isso que o bug do fuso passou:
// todas liam o relógio do processo enquanto a exibição usava Brasília.
// Os casos abaixo valem igual na máquina do dev e na Vercel (UTC).

/** Quinta, 6 de agosto de 2026, 20:30 em Brasília. */
const FUT = instanteDoFuso(2026, 7, 6, 20, 30);

describe("weekdayName", () => {
  it("usa o dia do fuso do app, não o do processo", () => {
    // 00:30 UTC de sexta ainda é quinta à noite em Brasília.
    expect(weekdayName(new Date("2026-08-21T00:30:00.000Z"))).toBe("Quinta");
  });

  it("nomeia o fut de quinta à noite como quinta", () => {
    expect(weekdayName(FUT)).toBe("Quinta");
  });
});

describe("nomeDoDiaDaSemana", () => {
  it("traduz o índice que o grupo guarda na recorrência", () => {
    expect(nomeDoDiaDaSemana(0)).toBe("Domingo");
    expect(nomeDoDiaDaSemana(4)).toBe("Quinta");
    expect(nomeDoDiaDaSemana(6)).toBe("Sábado");
  });
});

describe("formatRoundSchedule", () => {
  it("mostra a hora que o organizador digitou", () => {
    // A regressão que o usuário viu: config dizia 20:30 e a tela, 17:30.
    expect(formatRoundSchedule(FUT, FUT, 90)).toBe("Quinta · 20:30–22:00");
  });

  it("omite o fim quando o grupo não tem duração padrão", () => {
    expect(formatRoundSchedule(FUT, FUT, null)).toBe("Quinta · 20:30");
  });
});

describe("relativeDay", () => {
  it("conta as meia-noites do fuso, não as do UTC", () => {
    const agora = instanteDoFuso(2026, 7, 4, 9, 0);
    expect(relativeDay(FUT, agora)).toBe("em 2 dias");
  });

  it("chama de hoje o fut da noite, mesmo quando em UTC já é amanhã", () => {
    // 20:30 em Brasília é 23:30 UTC; às 22h UTC ainda é o mesmo dia lá.
    const agora = instanteDoFuso(2026, 7, 6, 19, 0);
    expect(relativeDay(FUT, agora)).toBe("hoje");
  });

  it("entende ontem e amanhã", () => {
    expect(relativeDay(FUT, instanteDoFuso(2026, 7, 5, 21, 0))).toBe("amanhã");
    expect(relativeDay(FUT, instanteDoFuso(2026, 7, 7, 8, 0))).toBe("ontem");
  });
});

describe("startOfMonth", () => {
  it("corta o mês pela meia-noite de Brasília", () => {
    // 01/09 00:30 UTC ainda é 31/08 no Brasil: a artilharia é a de agosto.
    const instante = new Date("2026-09-01T00:30:00.000Z");
    expect(startOfMonth(instante).toISOString()).toBe("2026-08-01T03:00:00.000Z");
  });
});
