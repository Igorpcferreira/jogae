const TZ = "America/Sao_Paulo";

const WEEKDAYS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

export function weekdayName(date: Date): string {
  return WEEKDAYS[date.getDay()];
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
  const parts = [weekdayName(date)];
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

/** "em 2 dias", "hoje", "amanhã" — usado no card da próxima rodada. */
export function relativeDay(date: Date, now = new Date()): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round(
    (startOfDay(date).getTime() - startOfDay(now).getTime()) / 86_400_000,
  );
  if (diff === 0) return "hoje";
  if (diff === 1) return "amanhã";
  if (diff === -1) return "ontem";
  if (diff > 1) return `em ${diff} dias`;
  return `há ${Math.abs(diff)} dias`;
}

export function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
