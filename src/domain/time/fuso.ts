// Fuso horário, isolado e puro.
//
// Existe porque o `Date` do JavaScript mistura duas coisas: um instante no
// tempo e a hora de parede de quem está lendo. `new Date(ano, mês, dia, 20, 30)`
// não guarda "20:30" — guarda o instante em que o relógio **do servidor**
// marcava 20:30. Na Vercel o servidor roda em UTC, então "20:30" virava
// 20:30 UTC e a tela, que formata em horário de Brasília, mostrava 17:30.
//
// A regra do projeto passa a ser: **hora de parede sempre entra e sai pelo
// mesmo fuso**, declarado, nunca o do processo.

/**
 * O fuso em que o Jogaê pensa.
 *
 * Hoje é um só pra todo mundo. A limitação conhecida é grupo fora de Brasília
 * — o Fut Manus joga em UTC−4 e vê o horário de Brasília. Corrigir isso é dar
 * fuso próprio ao grupo (coluna em `FootballGroup`); a assinatura das funções
 * daqui já aceita o fuso por parâmetro justamente pra essa mudança ser local.
 */
export const FUSO_PADRAO = "America/Sao_Paulo";

export interface PartesDoRelogio {
  ano: number;
  /** 0–11, como `Date#getMonth`. */
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  /** 0=domingo … 6=sábado, como `Date#getDay`. */
  diaDaSemana: number;
}

const DIAS_DA_SEMANA = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatador(fuso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: fuso,
    // `h23` em vez de `hour12: false`: algumas versões do ICU devolvem "24"
    // para a meia-noite quando se usa a segunda forma.
    hourCycle: "h23",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Que horas o relógio do fuso marca neste instante. */
export function partesNoFuso(instante: Date, fuso: string = FUSO_PADRAO): PartesDoRelogio {
  const partes: Record<string, string> = {};
  for (const parte of formatador(fuso).formatToParts(instante)) {
    partes[parte.type] = parte.value;
  }

  return {
    ano: Number(partes.year),
    mes: Number(partes.month) - 1,
    dia: Number(partes.day),
    hora: Number(partes.hour),
    minuto: Number(partes.minute),
    diaDaSemana: DIAS_DA_SEMANA.indexOf(partes.weekday),
  };
}

/** Quanto o fuso está deslocado do UTC neste instante, em milissegundos. */
function deslocamento(instante: number, fuso: string): number {
  const p = partesNoFuso(new Date(instante), fuso);
  const segundos = Number(
    formatador(fuso)
      .formatToParts(new Date(instante))
      .find((parte) => parte.type === "second")?.value ?? 0,
  );
  return Date.UTC(p.ano, p.mes, p.dia, p.hora, p.minuto, segundos) - instante;
}

/**
 * O instante em que o relógio do fuso marca esta hora de parede.
 *
 * `dia` pode estourar o mês (dia 35 de agosto vira 4 de setembro), como no
 * construtor do `Date` — é o que deixa "somar uma semana" trivial.
 *
 * O deslocamento é medido duas vezes de propósito: o primeiro palpite pode
 * cair do outro lado de uma virada de horário de verão. O Brasil não tem mais
 * horário de verão desde 2019, mas a função não deve depender disso.
 */
export function instanteDoFuso(
  ano: number,
  mes: number,
  dia: number,
  hora: number,
  minuto: number,
  fuso: string = FUSO_PADRAO,
): Date {
  const comoSeFosseUtc = Date.UTC(ano, mes, dia, hora, minuto, 0, 0);

  const primeiro = deslocamento(comoSeFosseUtc, fuso);
  const candidato = comoSeFosseUtc - primeiro;

  const segundo = deslocamento(candidato, fuso);
  return new Date(segundo === primeiro ? candidato : comoSeFosseUtc - segundo);
}

/** 0=domingo … 6=sábado, segundo o relógio do fuso. */
export function diaDaSemanaNoFuso(instante: Date, fuso: string = FUSO_PADRAO): number {
  return partesNoFuso(instante, fuso).diaDaSemana;
}

/** Meia-noite do dia em que este instante cai, no fuso. */
export function inicioDoDiaNoFuso(instante: Date, fuso: string = FUSO_PADRAO): Date {
  const { ano, mes, dia } = partesNoFuso(instante, fuso);
  return instanteDoFuso(ano, mes, dia, 0, 0, fuso);
}

/** Meia-noite do primeiro dia do mês em que este instante cai, no fuso. */
export function inicioDoMesNoFuso(instante: Date, fuso: string = FUSO_PADRAO): Date {
  const { ano, mes } = partesNoFuso(instante, fuso);
  return instanteDoFuso(ano, mes, 1, 0, 0, fuso);
}
