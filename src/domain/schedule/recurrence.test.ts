import { describe, expect, it } from "vitest";
import { instanteDoFuso, partesNoFuso } from "@/domain/time/fuso";
import { lerHorario, proximaDataRecorrente } from "./recurrence";

// Nada aqui usa `getHours`/`getDate`: eles leem o fuso do processo, e era
// justamente essa leitura que escondia o bug do 17:30 — a suíte passava na
// máquina do dev (horário do Brasil) e mentia sobre a Vercel (UTC).
// Tudo é montado e conferido pelo relógio de Brasília, explicitamente.

/** Quinta, 6 de agosto de 2026, 10h da manhã em Brasília. */
const QUINTA_DE_MANHA = instanteDoFuso(2026, 7, 6, 10, 0);

const relogio = (data: Date) => partesNoFuso(data);

describe("lerHorario", () => {
  it("entende o formato usado na config do grupo", () => {
    expect(lerHorario("20:30")).toEqual({ hora: 20, minuto: 30 });
    expect(lerHorario("7:05")).toEqual({ hora: 7, minuto: 5 });
  });

  it("cai em 20:00 quando o valor não presta", () => {
    expect(lerHorario(null)).toEqual({ hora: 20, minuto: 0 });
    expect(lerHorario("")).toEqual({ hora: 20, minuto: 0 });
    expect(lerHorario("25:00")).toEqual({ hora: 20, minuto: 0 });
    expect(lerHorario("quinta")).toEqual({ hora: 20, minuto: 0 });
  });
});

describe("proximaDataRecorrente", () => {
  it("grava a hora do grupo, não a do servidor", () => {
    // A regressão do bug do 17:30: 20:30 em Brasília é 23:30 em UTC, e tem
    // que continuar sendo isso mesmo quando o processo roda em outro fuso.
    const data = proximaDataRecorrente([4], "20:30", QUINTA_DE_MANHA);
    expect(data.toISOString()).toBe("2026-08-06T23:30:00.000Z");
    expect(relogio(data).hora).toBe(20);
    expect(relogio(data).minuto).toBe(30);
  });

  it("marca hoje quando o horário ainda não chegou", () => {
    const data = proximaDataRecorrente([4], "20:30", QUINTA_DE_MANHA);
    expect(relogio(data).diaDaSemana).toBe(4);
    expect(relogio(data).dia).toBe(6);
  });

  it("pula pra semana que vem quando o fut de hoje já passou", () => {
    const quintaTarde = instanteDoFuso(2026, 7, 6, 22, 0);
    const data = proximaDataRecorrente([4], "20:30", quintaTarde);
    expect(relogio(data).diaDaSemana).toBe(4);
    expect(relogio(data).dia).toBe(13);
  });

  it("escolhe o dia mais próximo quando o grupo joga mais de uma vez por semana", () => {
    // Joga terça (2) e quinta (4); hoje é quinta de manhã → hoje mesmo.
    expect(relogio(proximaDataRecorrente([2, 4], "20:30", QUINTA_DE_MANHA)).dia).toBe(6);

    // Depois da quinta à noite, o próximo é a terça seguinte.
    const quintaNoite = instanteDoFuso(2026, 7, 6, 23, 0);
    const proxima = proximaDataRecorrente([2, 4], "20:30", quintaNoite);
    expect(relogio(proxima).diaDaSemana).toBe(2);
    expect(relogio(proxima).dia).toBe(11);
  });

  it("sem recorrência, chuta daqui a uma semana no mesmo horário", () => {
    const data = proximaDataRecorrente([], "19:00", QUINTA_DE_MANHA);
    expect(relogio(data).dia).toBe(13);
    expect(relogio(data).hora).toBe(19);
  });

  it("ignora dia da semana fora da faixa 0–6", () => {
    const data = proximaDataRecorrente([9, -1], "20:30", QUINTA_DE_MANHA);
    expect(relogio(data).dia).toBe(13);
  });

  it("atravessa a virada de mês sem tropeçar", () => {
    // Segunda, 31 de agosto de 2026, 22h; o grupo joga na segunda.
    const fimDoMes = instanteDoFuso(2026, 7, 31, 22, 0);
    const data = proximaDataRecorrente([1], "20:00", fimDoMes);
    expect(relogio(data).mes).toBe(8); // setembro
    expect(relogio(data).dia).toBe(7);
  });

  it("sempre devolve data no futuro", () => {
    for (let dia = 0; dia <= 6; dia++) {
      const data = proximaDataRecorrente([dia], "20:30", QUINTA_DE_MANHA);
      expect(data.getTime()).toBeGreaterThan(QUINTA_DE_MANHA.getTime());
    }
  });

  it("respeita o fuso do grupo quando ele não é o de Brasília", () => {
    // Manaus é UTC−4: o mesmo 20:30 é uma hora depois em instante absoluto.
    const agora = instanteDoFuso(2026, 7, 6, 10, 0, "America/Manaus");
    const data = proximaDataRecorrente([4], "20:30", agora, "America/Manaus");
    expect(data.toISOString()).toBe("2026-08-07T00:30:00.000Z");
    expect(partesNoFuso(data, "America/Manaus").hora).toBe(20);
  });
});
