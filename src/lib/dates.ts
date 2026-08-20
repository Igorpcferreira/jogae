import {
  FUSO_PADRAO,
  diaDaSemanaNoFuso,
  inicioDoDiaNoFuso,
  inicioDoMesNoFuso,
} from "@/domain/time/fuso";

const TZ = FUSO_PADRAO;

const WEEKDAYS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

/**
 * Nome do dia a partir do índice (0=domingo), que é como o grupo guarda a
 * recorrência. Existe pra ninguém precisar inventar uma data só pra descobrir
 * o nome do dia — o truque antigo (`new Date(2024, 0, 7 + dia)`) só acertava
 * porque construção e leitura usavam o mesmo fuso do processo.
 */
export function nomeDoDiaDaSemana(indice: number): string {
  return WEEKDAYS[((indice % 7) + 7) % 7];
}

/** Nome do dia em que o instante cai, no fuso do app. */
export function weekdayName(date: Date): string {
  return WEEKDAYS[diaDaSemanaNoFuso(date, TZ)];
}

export function formatTime(date: Date | null | undefined): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(date);
}

export function formatDayMonth(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: TZ,
  }).format(date);
}

export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    timeZone: TZ,
  }).format(date);
}

/** "Quinta · 20:30–22:00" — formato usado em toda a UI. */
export function formatRoundSchedule(
  date: Date,
  startsAt: Date | null,
  durationMin?: number | null,
): string {
  const parts = [weekdayName(startsAt ?? date)];
  const start = formatTime(startsAt ?? date);
  if (start) {
    if (durationMin) {
      const end = new Date((startsAt ?? date).getTime() + durationMin * 60_000);
      parts.push(`${start}–${formatTime(end)}`);
    } else {
      parts.push(start);
    }
  }
  return parts.join(" · ");
}

export function greeting(now = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: TZ }).format(
      now,
    ),
  );
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * "em 2 dias", "hoje", "amanhã" — usado no card da próxima rodada.
 *
 * A diferença é contada entre as meia-noites **do fuso do app**. Contar pelo
 * relógio do processo fazia o fut de quinta à noite virar "amanhã" num
 * servidor em UTC, onde aquele instante já é sexta.
 */
export function relativeDay(date: Date, now = new Date()): string {
  const diff = Math.round(
    (inicioDoDiaNoFuso(date, TZ).getTime() - inicioDoDiaNoFuso(now, TZ).getTime()) / 86_400_000,
  );
  if (diff === 0) return "hoje";
  if (diff === 1) return "amanhã";
  if (diff === -1) return "ontem";
  if (diff > 1) return `em ${diff} dias`;
  return `há ${Math.abs(diff)} dias`;
}

/** Primeiro instante do mês corrente, no fuso do app — recorte da artilharia. */
export function startOfMonth(date = new Date()): Date {
  return inicioDoMesNoFuso(date, TZ);
}

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

/**
 * Nome do mês por índice (0–11), como `partesNoFuso` devolve.
 *
 * Por índice e não por `Date`: quem já resolveu o fuso tem o número na mão, e
 * remontar um `Date` só pra formatar é o caminho mais curto pra ler o mês pelo
 * relógio do processo de novo.
 */
export function nomeDoMes(indice: number): string {
  return MESES[indice] ?? "";
}

/** "Janeiro de 2026" — cabeçalho de retrospectiva e de melhor mês. */
export function mesEAno(indice: number, ano: number): string {
  return `${nomeDoMes(indice)} de ${ano}`;
}
