// Gol repetido — o remédio contra contagem dupla quando mais de um celular
// aponta o mesmo jogo.
//
// O `clientEventId` da fila offline (plano §40) resolve o reenvio *do mesmo
// aparelho*. Ele não resolve o caso que aparece assim que o link do grupo entra
// no ar: sai o gol, duas pessoas empolgadas apertam o botão, e viram dois gols.
// Não é malandragem — é o comportamento normal de quem está assistindo, e o
// mesmo dedo ansioso produz o toque duplo sozinho.
//
// Por que **perguntar** em vez de bloquear: gol fantasma contamina placar →
// ranking → artilharia → conquista, e ninguém reconstrói isso depois; mas gol
// legítimo recusado também não tem conserto, e o cara que fez o gol está
// olhando. Em fut amador dois gols do mesmo time em 20 segundos é quase
// impossível (tem que voltar pro meio e sair de novo), então o falso positivo é
// raro e custa um toque. Bloquear custaria um gol.
//
// Puro de propósito: a tela só desenha a pergunta que esta função decidiu.

/** Quanto tempo depois de um gol o próximo do mesmo time ainda é suspeito. */
export const JANELA_DE_GOL_REPETIDO_MS = 20_000;

export interface LanceRegistrado {
  id: string;
  teamId: string;
  /** Quando o lance entrou, em epoch ms **do relógio do servidor**. */
  registradoEm: number;
  /** Autor, quando alguém marcou. Só serve pra tela dizer de quem foi. */
  autor?: string | null;
  /** Lance desfeito não conta: quem desfez já disse que aquilo não foi gol. */
  desfeito?: boolean;
}

export interface GolRepetido {
  /** O lance que levanta a suspeita. */
  id: string;
  autor: string | null;
  /** Há quantos segundos ele entrou — é o que a pergunta mostra. */
  segundos: number;
}

/**
 * O gol do mesmo time que entrou agorinha, se existir.
 *
 * `agora` vem de fora porque o relógio de quem chama não é confiável: o celular
 * na beira do campo pode estar minutos fora do servidor, e comparar os dois
 * relógios direto faria a checagem sumir em silêncio. Quem chama corrige o
 * desvio antes (ver `live-control.tsx`).
 *
 * Desvio residual é tolerado nos dois sentidos: lance "do futuro" dentro da
 * janela continua sendo suspeito, porque atraso de rede e arredondamento
 * produzem diferença negativa de poucos segundos o tempo todo.
 */
export function golRecenteDoMesmoTime(
  lances: readonly LanceRegistrado[],
  teamId: string,
  agora: number,
  janelaMs: number = JANELA_DE_GOL_REPETIDO_MS,
): GolRepetido | null {
  let maisRecente: LanceRegistrado | null = null;

  for (const lance of lances) {
    if (lance.desfeito) continue;
    if (lance.teamId !== teamId) continue;

    const passados = agora - lance.registradoEm;
    if (passados > janelaMs || passados < -janelaMs) continue;

    if (!maisRecente || lance.registradoEm > maisRecente.registradoEm) {
      maisRecente = lance;
    }
  }

  if (!maisRecente) return null;

  return {
    id: maisRecente.id,
    autor: maisRecente.autor ?? null,
    // Nunca negativo na tela: "há -2 segundos" não quer dizer nada pra ninguém.
    segundos: Math.max(0, Math.round((agora - maisRecente.registradoEm) / 1000)),
  };
}
