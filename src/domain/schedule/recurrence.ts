// Quando cai a próxima rodada. Puro para poder testar virada de semana,
// horário já passado e grupo sem recorrência sem subir banco nem servidor.

/** "20:30" → { hora: 20, minuto: 30 }. Entrada inválida cai em 20:00. */
export function lerHorario(startTime: string | null | undefined): {
  hora: number;
  minuto: number;
} {
  const partes = /^(\d{1,2}):(\d{2})$/.exec((startTime ?? "").trim());
  if (!partes) return { hora: 20, minuto: 0 };

  const hora = Number(partes[1]);
  const minuto = Number(partes[2]);
  if (hora > 23 || minuto > 59) return { hora: 20, minuto: 0 };

  return { hora, minuto };
}

/**
 * Próxima ocorrência a partir de `agora`.
 *
 * - `weekdays` usa 0=domingo … 6=sábado, como `Date#getDay`.
 * - Hoje só conta se o horário ainda não passou: quinta 21h não marca o fut
 *   de quinta 20:30 que já acabou.
 * - Sem recorrência definida, joga uma semana pra frente — é um palpite
 *   honesto que o organizador corrige na tela.
 */
export function proximaDataRecorrente(
  weekdays: number[],
  startTime: string | null | undefined,
  agora: Date = new Date(),
): Date {
  const { hora, minuto } = lerHorario(startTime);
  const base = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate(),
    hora,
    minuto,
    0,
    0,
  );

  const dias = weekdays.filter((dia) => Number.isInteger(dia) && dia >= 0 && dia <= 6);

  if (dias.length === 0) {
    base.setDate(base.getDate() + 7);
    return base;
  }

  for (let offset = 0; offset < 8; offset++) {
    const candidato = new Date(base);
    candidato.setDate(candidato.getDate() + offset);
    if (dias.includes(candidato.getDay()) && candidato > agora) return candidato;
  }

  base.setDate(base.getDate() + 7);
  return base;
}
