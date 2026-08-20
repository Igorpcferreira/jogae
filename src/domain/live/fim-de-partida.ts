/**
 * Fim de partida por regra do grupo (ex.: "vai até 2 gols ou 8 minutos").
 *
 * No fut de resenha a partida não tem 90 minutos: ela acaba quando um time
 * faz X gols ou quando o relógio bate Y minutos — e cada grupo tem seus
 * números. A regra mora em `FootballGroup.settings` (JSON) porque é opcional
 * e varia por grupo; grupo sem regra configurada joga como sempre jogou.
 *
 * O app **avisa, não encerra sozinho**: o apito é do organizador. Encerrar por
 * conta própria descartaria o "deixa mais um minutinho" que todo fut tem, e um
 * gol registrado com atraso derrubaria a partida no meio do lance. Mesma
 * filosofia da pergunta de gol repetido: perguntar custa um toque, decidir
 * errado custa a rodada.
 */

export interface RegrasDePartida {
  /** Partida termina quando um time chega neste total de gols. Nulo = sem limite. */
  limiteGols: number | null;
  /** Partida termina quando o relógio bate estes minutos. Nulo = sem limite. */
  limiteMinutos: number | null;
}

export const SEM_REGRAS: RegrasDePartida = { limiteGols: null, limiteMinutos: null };

export const LIMITE_GOLS_MAXIMO = 30;
export const LIMITE_MINUTOS_MAXIMO = 120;

function inteiroNoIntervalo(valor: unknown, maximo: number): number | null {
  if (typeof valor !== "number" || !Number.isInteger(valor)) return null;
  if (valor < 1 || valor > maximo) return null;
  return valor;
}

/**
 * Lê as regras do `settings` do grupo sem confiar no formato: o JSON é livre
 * e pode ter sido gravado por versão antiga do app. Valor fora do intervalo
 * vira "sem limite" em vez de quebrar a tela do ao vivo.
 */
export function lerRegrasDePartida(settings: unknown): RegrasDePartida {
  if (!settings || typeof settings !== "object") return SEM_REGRAS;
  const partida = (settings as { partida?: unknown }).partida;
  if (!partida || typeof partida !== "object") return SEM_REGRAS;
  const bruto = partida as { limiteGols?: unknown; limiteMinutos?: unknown };
  return {
    limiteGols: inteiroNoIntervalo(bruto.limiteGols, LIMITE_GOLS_MAXIMO),
    limiteMinutos: inteiroNoIntervalo(bruto.limiteMinutos, LIMITE_MINUTOS_MAXIMO),
  };
}

export interface SituacaoDaPartida {
  fim: boolean;
  /** O que encerrou. Com os dois limites batidos, gols ganha: foi o evento. */
  motivo: "gols" | "tempo" | null;
  /** Segundos até o limite de tempo. Nulo quando não há limite de minutos. */
  restanteSeg: number | null;
}

export function situacaoDaPartida({
  golsA,
  golsB,
  decorridoSeg,
  regras,
}: {
  golsA: number;
  golsB: number;
  decorridoSeg: number;
  regras: RegrasDePartida;
}): SituacaoDaPartida {
  const porGols =
    regras.limiteGols !== null && Math.max(golsA, golsB) >= regras.limiteGols;

  const restanteSeg =
    regras.limiteMinutos !== null
      ? Math.max(0, regras.limiteMinutos * 60 - Math.max(0, decorridoSeg))
      : null;
  const porTempo = restanteSeg !== null && restanteSeg === 0;

  return {
    fim: porGols || porTempo,
    motivo: porGols ? "gols" : porTempo ? "tempo" : null,
    restanteSeg,
  };
}

/**
 * A regra por extenso, pra tela de "escolher confronto" e pra página pública.
 * Grupo que escreveu a própria regra em texto (`settings.matchRule`) continua
 * mandando — este é só o fallback derivado dos números.
 */
export function descreverRegras(regras: RegrasDePartida): string | null {
  const partes: string[] = [];
  if (regras.limiteGols !== null) {
    partes.push(regras.limiteGols === 1 ? "1 gol" : `${regras.limiteGols} gols`);
  }
  if (regras.limiteMinutos !== null) {
    partes.push(
      regras.limiteMinutos === 1 ? "1 minuto" : `${regras.limiteMinutos} minutos`,
    );
  }
  if (partes.length === 0) return null;
  return `Partida vai até ${partes.join(" ou ")}.`;
}
