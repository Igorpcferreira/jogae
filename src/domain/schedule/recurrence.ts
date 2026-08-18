// Quando cai a próxima rodada. Puro para poder testar virada de semana,
// horário já passado e grupo sem recorrência sem subir banco nem servidor.

import {
  FUSO_PADRAO,
  diaDaSemanaNoFuso,
  instanteDoFuso,
  partesNoFuso,
} from "@/domain/time/fuso";

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
 *
 * O horário é ancorado no **fuso do app**, nunca no do processo. Era essa a
 * origem do bug do 17:30: `new Date(ano, mês, dia, 20, 30)` num servidor em
 * UTC gravava 20:30 UTC, e a tela, que formata em Brasília, mostrava 17:30.
 */
export function proximaDataRecorrente(
  weekdays: number[],
  startTime: string | null | undefined,
  agora: Date = new Date(),
  fuso: string = FUSO_PADRAO,
): Date {
  const { hora, minuto } = lerHorario(startTime);
  const hoje = partesNoFuso(agora, fuso);

  /** O fut de daqui a `offset` dias, no horário do grupo. */
  const rodadaEm = (offset: number) =>
    instanteDoFuso(hoje.ano, hoje.mes, hoje.dia + offset, hora, minuto, fuso);

  const dias = weekdays.filter((dia) => Number.isInteger(dia) && dia >= 0 && dia <= 6);

  if (dias.length === 0) return rodadaEm(7);

  for (let offset = 0; offset < 8; offset++) {
    const candidato = rodadaEm(offset);
    if (dias.includes(diaDaSemanaNoFuso(candidato, fuso)) && candidato > agora) {
      return candidato;
    }
  }

  return rodadaEm(7);
}
