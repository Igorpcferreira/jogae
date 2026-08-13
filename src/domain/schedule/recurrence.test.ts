import { describe, expect, it } from "vitest";
import { lerHorario, proximaDataRecorrente } from "./recurrence";

/** Quinta, 6 de agosto de 2026, 10h da manhã. */
const QUINTA_DE_MANHA = new Date(2026, 7, 6, 10, 0, 0, 0);

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
  it("marca hoje quando o horário ainda não chegou", () => {
    const data = proximaDataRecorrente([4], "20:30", QUINTA_DE_MANHA);
    expect(data.getDay()).toBe(4);
    expect(data.getDate()).toBe(6);
    expect(data.getHours()).toBe(20);
    expect(data.getMinutes()).toBe(30);
  });

  it("pula pra semana que vem quando o fut de hoje já passou", () => {
    const quintaTarde = new Date(2026, 7, 6, 22, 0, 0, 0);
    const data = proximaDataRecorrente([4], "20:30", quintaTarde);
    expect(data.getDay()).toBe(4);
    expect(data.getDate()).toBe(13);
  });

  it("escolhe o dia mais próximo quando o grupo joga mais de uma vez por semana", () => {
    // Joga terça (2) e quinta (4); hoje é quinta de manhã → hoje mesmo.
    expect(proximaDataRecorrente([2, 4], "20:30", QUINTA_DE_MANHA).getDate()).toBe(6);

    // Depois da quinta à noite, o próximo é a terça seguinte.
    const quintaNoite = new Date(2026, 7, 6, 23, 0, 0, 0);
    const proxima = proximaDataRecorrente([2, 4], "20:30", quintaNoite);
    expect(proxima.getDay()).toBe(2);
    expect(proxima.getDate()).toBe(11);
  });

  it("sem recorrência, chuta daqui a uma semana no mesmo horário", () => {
    const data = proximaDataRecorrente([], "19:00", QUINTA_DE_MANHA);
    expect(data.getDate()).toBe(13);
    expect(data.getHours()).toBe(19);
  });

  it("ignora dia da semana fora da faixa 0–6", () => {
    const data = proximaDataRecorrente([9, -1], "20:30", QUINTA_DE_MANHA);
    expect(data.getDate()).toBe(13);
  });

  it("atravessa a virada de mês sem tropeçar", () => {
    // Segunda, 31 de agosto de 2026, 22h; o grupo joga na segunda.
    const fimDoMes = new Date(2026, 7, 31, 22, 0, 0, 0);
    const data = proximaDataRecorrente([1], "20:00", fimDoMes);
    expect(data.getMonth()).toBe(8); // setembro
    expect(data.getDate()).toBe(7);
  });

  it("sempre devolve data no futuro", () => {
    for (let dia = 0; dia <= 6; dia++) {
      const data = proximaDataRecorrente([dia], "20:30", QUINTA_DE_MANHA);
      expect(data.getTime()).toBeGreaterThan(QUINTA_DE_MANHA.getTime());
    }
  });
});
